import { createHash } from "node:crypto";
import { Networks, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { ProviderError } from "../errors.js";
import { logProviderError } from "../log.js";
import { createTtlCache } from "../cache.js";
import { ed25519AddressFromMultibase } from "../didKey.js";

// Proveedor ACTA (solo testnet). Es el único código que habla con ACTA: las rutas llaman a este módulo,
// nunca a fetch directo, para poder cambiarlo por un contrato propio sin tocar las pantallas.
//
// Comprobado en vivo (18 oct): GET /config (networkType, didStellarRegistryId), GET {resolver}/health
// (networks.testnet), el vault y la resolución de DIDs. Cada lectura está aislada en su función para
// ajustarla en un solo lugar si ACTA cambia su respuesta.

/**
 * @typedef {object} ActaProvider
 * @property {() => Promise<{networkType: string, registryId: string|null}>} getNetworkInfo
 * @property {() => Promise<{registryId: string|null}>} getResolverInfo
 * @property {() => Promise<{owner: string, vaultAddress: string, didUri: string|null, version: number|null, vcCount: number|null}>} getVaultInfo
 * @property {(huella: string) => Promise<{status: "valid"|"revoked"|"invalid"|"unknown", since?: string}>} getStatus
 * @property {(huella: string) => Promise<{id: string, issuerDid: string|null, issuanceContract: string|null, data: object|null}|null>} getCredential
 *   `data` es el objeto ya leído, o null si el texto guardado no es un JSON válido (credencial no confiable).
 * @property {(did: string) => Promise<{controller: string|null, authenticationKeys: string[], deactivated: boolean}|null>} resolveDid
 * @property {(input: {huella: string, vcDataText: string}) => Promise<Prepared>} prepareIssue
 * @property {(input: {huella: string, dateIso: string}) => Promise<Prepared>} prepareRevoke
 *   Prepared = { xdr, networkPassphrase, request }: `request` es el cuerpo enviado a ACTA, que hay que
 *   devolver al enviar la transacción firmada (la API de ACTA lo pide junto con `signedXdr`).
 * @property {(input: {operation: "issue"|"revoke", huella: string, request: object, signedXdr: string}) => Promise<{txId: string|null, via: "api"|"rpc"|"already-applied"}>} submit
 *   Camino principal: la API de ACTA (`signedXdr` con el mismo cuerpo, con Idempotency-Key). Solo si la API
 *   no responde o falla, y la operación no entró, se envía la misma transacción firmada a la red (RPC de
 *   Stellar). El servidor no tiene ningún secreto de Stellar.
 * @property {(huella: string, expected: "valid"|"revoked") => Promise<boolean>} waitForStatus
 */

const VAULT_STATUSES = new Set(["valid", "revoked", "invalid", "unknown"]);
const DID_PATTERN = /^did:stellar:testnet:[a-z0-9]{10,64}$/;
const ACTA_CODE_PATTERN = /^[a-z0-9_]{1,64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;
const NETWORK_TTL_MS = 5 * 60 * 1000;
// Medido en vivo (18 oct): a veces una petición de ACTA se queda colgada (8 s sin respuesta) mientras las
// siguientes responden bien. Por eso se corta pronto y se reintenta una vez, en vez de esperar más.
const DEFAULT_TIMEOUT_MS = 5000;
const READ_ATTEMPTS = 2;
// Preparar (ACTA simula la transacción) tarda más que una lectura; enviar, más aún y no se reintenta solo.
const PREPARE_TIMEOUT_MS = 6000;
const WRITE_TIMEOUT_MS = 9000;
const RPC_TIMEOUT_MS = 6000;
const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1200;

// Nombre del código de resultado de una transacción (por ejemplo "txTooLate"), sin ningún dato más.
function resultName(result) {
  try {
    return result.result().switch().name;
  } catch {
    return null;
  }
}

function classifyTransactionFailure(name) {
  if (name === "txTooLate" || name === "txTooEarly") return "tx_expired";
  if (name === "txBadSeq") return "tx_bad_sequence";
  if (name === "txInsufficientBalance") return "tx_insufficient_funds";
  return "tx_rejected";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(response) {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// Convierte una respuesta de error de ACTA en un error propio. Se ramifica por `error` (código), nunca por `message`.
function errorFromResponse(status, json, operation) {
  const code = isObject(json) && ACTA_CODE_PATTERN.test(String(json.error)) ? json.error : null;
  const requestId = isObject(json) && REQUEST_ID_PATTERN.test(String(json.request_id)) ? json.request_id : null;
  const details = { status, code, requestId, operation };
  if (status === 401) return new ProviderError("unauthorized", details);
  if (status === 403) return new ProviderError("forbidden", details);
  if (status === 404) return new ProviderError("not_found", details);
  if (status === 429) return new ProviderError("rate_limited", details);
  if (status >= 500) return new ProviderError("unavailable", details);
  return new ProviderError("bad_request", details);
}

function findMethodKey(methods, reference) {
  if (methods.has(reference)) return methods.get(reference);
  if (!reference.startsWith("#")) return null;
  for (const [id, key] of methods) {
    if (id.endsWith(reference)) return key;
  }
  return null;
}

// Direcciones G... de las claves de `authentication` de un documento DID.
// Acepta referencias ("#auth-1" o el id completo) y claves incrustadas.
export function extractAuthenticationKeys(document) {
  const methods = new Map();
  const verificationMethods = Array.isArray(document.verificationMethod) ? document.verificationMethod : [];
  for (const method of verificationMethods) {
    if (isObject(method) && typeof method.id === "string" && typeof method.publicKeyMultibase === "string") {
      methods.set(method.id, method.publicKeyMultibase);
    }
  }

  const addresses = [];
  const entries = Array.isArray(document.authentication) ? document.authentication : [];
  for (const entry of entries) {
    let multibase = null;
    if (typeof entry === "string") multibase = findMethodKey(methods, entry);
    else if (isObject(entry) && typeof entry.publicKeyMultibase === "string") multibase = entry.publicKeyMultibase;
    const address = multibase ? ed25519AddressFromMultibase(multibase) : null;
    if (address) addresses.push(address);
  }
  return addresses;
}

function parseStoredData(raw) {
  if (isObject(raw)) return raw;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createActaProvider(
  config,
  {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    prepareTimeoutMs = PREPARE_TIMEOUT_MS,
    writeTimeoutMs = WRITE_TIMEOUT_MS,
    readAttempts = READ_ATTEMPTS,
    // El cliente RPC y la espera se pueden sustituir en las pruebas.
    rpcFactory = () =>
      new rpc.Server(config.stellarRpcUrl, {
        timeout: RPC_TIMEOUT_MS,
        allowHttp: config.stellarRpcUrl.startsWith("http:"),
      }),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    pollAttempts = POLL_ATTEMPTS,
    pollIntervalMs = POLL_INTERVAL_MS,
  } = {},
) {
  const networkCache = createTtlCache({ ttlMs: NETWORK_TTL_MS });
  // `owner` lo fija el servidor desde el entorno: nunca viene del navegador.
  const owner = config.institutionPublicKey;

  // `label` solo sirve para el registro técnico (en qué paso falló). `waitMs` permite más tiempo a las escrituras.
  // Solo para el registro técnico: "timeout" o el código de red (ENOTFOUND, ECONNRESET...). Nunca el mensaje.
  function networkFailureCode(error) {
    if (error && (error.name === "TimeoutError" || error.name === "AbortError")) return "timeout";
    const code = error && error.cause && error.cause.code;
    return typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code) ? code : "network";
  }

  // Solo se reintenta cuando no hubo respuesta (tiempo agotado o red caída): una respuesta de ACTA, buena o mala, no se repite.
  async function call({ base, path, method = "GET", body, withKey = false, extraHeaders = {}, waitMs = timeoutMs, attempts = readAttempts, label }) {
    const headers = { accept: "application/json", ...extraHeaders };
    if (withKey) headers["x-acta-key"] = config.actaApiKey;
    if (body !== undefined) headers["content-type"] = "application/json";

    let response;
    const startedAt = Date.now();
    for (let attempt = 1; ; attempt += 1) {
      try {
        response = await fetchImpl(`${base}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(waitMs),
        });
        break;
      } catch (error) {
        if (attempt >= attempts) {
          throw new ProviderError("unavailable", { operation: label, code: networkFailureCode(error), elapsedMs: Date.now() - startedAt });
        }
      }
    }

    const json = await readJson(response);
    if (response.ok) {
      if (json === null) throw new ProviderError("invalid_response", { status: response.status, operation: label });
      return json;
    }
    throw errorFromResponse(response.status, json, label);
  }

  async function getNetworkInfo() {
    const json = await call({ base: config.actaApiBase, path: "/config", label: "config" });
    if (!isObject(json) || typeof json.networkType !== "string") {
      throw new ProviderError("invalid_response");
    }
    const registryId = typeof json.didStellarRegistryId === "string" ? json.didStellarRegistryId : null;
    return { networkType: json.networkType, registryId };
  }

  // Solo testnet: si ACTA no dice "testnet", el proveedor se niega a trabajar.
  async function ensureTestnet() {
    const info = await networkCache.getOrLoad("network", getNetworkInfo, {
      shouldCache: (value) => value.networkType === "testnet",
    });
    if (info.networkType !== "testnet") throw new ProviderError("wrong_network");
  }

  async function getResolverInfo() {
    const json = await call({ base: config.didResolverBase, path: "/health", label: "resolver-health" });
    if (!isObject(json)) throw new ProviderError("invalid_response");
    // El resolver informa su registro por red: { networks: { testnet: "C...", mainnet: "C..." }, ... }
    const testnet = isObject(json.networks) ? json.networks.testnet : null;
    return { registryId: typeof testnet === "string" && CONTRACT_ID_PATTERN.test(testnet) ? testnet : null };
  }

  async function getVaultInfo() {
    await ensureTestnet();
    const json = await call({
      base: config.actaApiBase,
      path: `/contracts/vault/${encodeURIComponent(owner)}`,
      withKey: true,
      label: "vault-info",
    });
    if (!isObject(json) || typeof json.vault_address !== "string") {
      throw new ProviderError("invalid_response");
    }
    return {
      owner: typeof json.owner === "string" ? json.owner : owner,
      vaultAddress: json.vault_address,
      didUri: typeof json.did_uri === "string" ? json.did_uri : null,
      version: Number.isFinite(json.version) ? json.version : null,
      vcCount: Number.isFinite(json.vc_count) ? json.vc_count : null,
    };
  }

  // Decide siempre con verify-vc: tras revocar, get-vc sigue devolviendo la ficha.
  async function getStatus(huella) {
    await ensureTestnet();
    let json;
    try {
      json = await call({
        base: config.actaApiBase,
        path: "/contracts/vault/verify-vc",
        method: "POST",
        body: { owner, vcId: huella },
        withKey: true,
        label: "verify-vc",
      });
    } catch (error) {
      if (error.kind === "not_found" && error.code === "vc_not_found") return { status: "invalid" };
      throw error;
    }
    if (!isObject(json) || !VAULT_STATUSES.has(json.status)) throw new ProviderError("invalid_response");
    return { status: json.status, since: typeof json.since === "string" ? json.since : undefined };
  }

  async function getCredential(huella) {
    await ensureTestnet();
    let json;
    try {
      json = await call({
        base: config.actaApiBase,
        path: "/contracts/vault/get-vc",
        method: "POST",
        body: { owner, vcId: huella },
        withKey: true,
        label: "get-vc",
      });
    } catch (error) {
      if (error.kind === "not_found" && error.code === "vc_not_found") return null;
      throw error;
    }
    const record = isObject(json) ? json.result : null;
    if (!isObject(record)) throw new ProviderError("invalid_response");
    return {
      id: typeof record.id === "string" ? record.id : huella,
      issuerDid: typeof record.issuer_did === "string" ? record.issuer_did : null,
      issuanceContract: typeof record.issuance_contract === "string" ? record.issuance_contract : null,
      data: parseStoredData(record.data),
    };
  }

  async function resolveDid(did) {
    if (!DID_PATTERN.test(did)) throw new ProviderError("bad_request");
    let json;
    try {
      json = await call({ base: config.didResolverBase, path: `/1.0/identifiers/${did}`, label: "did" });
    } catch (error) {
      if (error.kind === "not_found") return null;
      if (error.status === 410) return { controller: null, authenticationKeys: [], deactivated: true };
      throw error;
    }
    if (!isObject(json)) throw new ProviderError("invalid_response");

    const document = isObject(json.didDocument) ? json.didDocument : json;
    const metadata = isObject(json.didDocumentMetadata) ? json.didDocumentMetadata : {};
    let controller = null;
    if (typeof document.controller === "string") controller = document.controller;
    else if (Array.isArray(document.controller) && typeof document.controller[0] === "string") {
      controller = document.controller[0];
    }
    return {
      controller,
      authenticationKeys: extractAuthenticationKeys(document),
      deactivated: metadata.deactivated === true || json.deactivated === true,
    };
  }

  // Escrituras: ACTA prepara la transacción (la simula y la arma); el XDR sin firmar vale 60 s.
  async function prepare(path, body, label) {
    await ensureTestnet();
    const json = await call({ base: config.actaApiBase, path, method: "POST", body, withKey: true, waitMs: prepareTimeoutMs, label });
    if (!isObject(json) || typeof json.xdr !== "string" || typeof json.network !== "string") {
      throw new ProviderError("invalid_response", { operation: label });
    }
    // ACTA dice la red con su frase ("Test SDF Network ; September 2015"); se acepta también el nombre corto.
    // Hacia el navegador siempre sale la frase de testnet: nunca la de otra red.
    if (json.network !== Networks.TESTNET && !/^testnet$/i.test(json.network)) {
      throw new ProviderError("wrong_network", { operation: label });
    }
    return { xdr: json.xdr, networkPassphrase: Networks.TESTNET, request: body };
  }

  // owner, issuer y sourcePublicKey los fija el servidor desde el entorno: nunca vienen del navegador.
  function prepareIssue({ huella, vcDataText }) {
    return prepare(
      "/contracts/vc/issue",
      {
        owner,
        vcId: huella,
        vcData: vcDataText,
        issuer: owner,
        issuerDid: config.institutionDid,
        sourcePublicKey: owner,
      },
      "prepare-issue",
    );
  }

  function prepareRevoke({ huella, dateIso }) {
    return prepare(
      "/contracts/vc/revoke",
      { owner, vcId: huella, date: dateIso, sourcePublicKey: owner },
      "prepare-revoke",
    );
  }

  // Espera (unos segundos) a que verify-vc muestre el estado esperado. true si ya se ve.
  async function waitForStatus(huella, expected) {
    for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
      try {
        if ((await getStatus(huella)).status === expected) return true;
      } catch {
        // Un fallo de lectura no es una respuesta: se sigue esperando.
      }
      if (attempt < pollAttempts - 1) await sleep(pollIntervalMs);
    }
    return false;
  }

  // Respaldo: envía la misma transacción firmada a la red (RPC de Stellar) y espera su resultado unos segundos.
  // El hash de la transacción hace que reenviarla sea inofensivo (idempotente).
  async function submitViaRpc(signedXdr) {
    let transaction;
    try {
      transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    } catch {
      throw new ProviderError("bad_request", { code: "xdr_invalid", operation: "rpc-send" });
    }

    const server = rpcFactory();
    let sent;
    try {
      sent = await server.sendTransaction(transaction);
    } catch {
      throw new ProviderError("unavailable", { operation: "rpc-send" });
    }

    if (sent.status === "ERROR") {
      const name = resultName(sent.errorResult);
      throw new ProviderError(classifyTransactionFailure(name), { code: name, operation: "rpc-send" });
    }
    if (sent.status === "TRY_AGAIN_LATER") {
      throw new ProviderError("unavailable", { code: "try_again_later", operation: "rpc-send" });
    }
    if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
      throw new ProviderError("invalid_response", { operation: "rpc-send" });
    }

    const txId = sent.hash;
    for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
      await sleep(pollIntervalMs);
      let found;
      try {
        found = await server.getTransaction(txId);
      } catch {
        continue;
      }
      if (found.status === "SUCCESS") return txId;
      if (found.status === "FAILED") {
        throw new ProviderError("tx_failed", { code: resultName(found.resultXdr), operation: "rpc-poll" });
      }
    }
    return txId;
  }

  // Envía la transacción ya firmada. Camino principal: la API de ACTA, con el mismo cuerpo de la preparación,
  // `signedXdr` y una Idempotency-Key (repetir el envío devuelve lo mismo en lugar de duplicarlo).
  // Solo si la API no responde o falla (su error 500 es genérico) y la operación NO entró, se usa el respaldo.
  async function submit({ operation, huella, request, signedXdr }) {
    await ensureTestnet();
    const expected = operation === "issue" ? "valid" : "revoked";
    const path = operation === "issue" ? "/contracts/vc/issue" : "/contracts/vc/revoke";

    try {
      const json = await call({
        base: config.actaApiBase,
        path,
        method: "POST",
        body: { ...request, signedXdr },
        withKey: true,
        extraHeaders: { "idempotency-key": createHash("sha256").update(signedXdr).digest("hex") },
        waitMs: writeTimeoutMs,
        attempts: 1,
        label: "submit-api",
      });
      const txId = typeof json.tx_id === "string" && json.tx_id.length <= 128 ? json.tx_id : null;
      return { txId, via: "api" };
    } catch (error) {
      if (!(error instanceof ProviderError) || (error.kind !== "unavailable" && error.kind !== "invalid_response")) {
        throw error;
      }
      // Aunque haya respaldo, el fallo de la API queda en el registro: es lo que permite diagnosticarlo.
      logProviderError(error);
      // La API pudo haber enviado la transacción aunque respondiera con error: primero se mira el estado.
      try {
        if ((await getStatus(huella)).status === expected) return { txId: null, via: "already-applied" };
      } catch {
        // Si ni siquiera se puede leer el estado, se intenta el respaldo igual.
      }
      return { txId: await submitViaRpc(signedXdr), via: "rpc" };
    }
  }

  return {
    getNetworkInfo,
    getResolverInfo,
    getVaultInfo,
    getStatus,
    getCredential,
    resolveDid,
    prepareIssue,
    prepareRevoke,
    submit,
    waitForStatus,
  };
}
