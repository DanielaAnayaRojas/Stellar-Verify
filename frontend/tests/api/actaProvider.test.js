import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createActaProvider, extractAuthenticationKeys } from "../../api/_lib/provider/acta.js";
import {
  CONFIG,
  FOREIGN_KEY_MULTIBASE,
  FOREIGN_PUBLIC_KEY,
  HUELLA_VALID,
  INSTITUTION_DID,
  INSTITUTION_KEY_MULTIBASE,
  INSTITUTION_PUBLIC_KEY,
  OLD_REGISTRY_ID,
  REGISTRY_ID,
  RESOLVER_HEALTH,
  VAULT_ADDRESS,
  createFakeFetch,
  jsonReply,
  storedData,
} from "../fixtures.js";

const ROUTE = {
  config: "GET /config",
  vault: `GET /contracts/vault/${INSTITUTION_PUBLIC_KEY}`,
  verify: "POST /contracts/vault/verify-vc",
  get: "POST /contracts/vault/get-vc",
};

// Cada prueba usa Response nuevas: un cuerpo solo se puede leer una vez.
function configOk() {
  return jsonReply(200, { networkType: "testnet", didStellarRegistryId: REGISTRY_ID });
}

function providerWith(routes, options) {
  const fetchImpl = createFakeFetch({ [ROUTE.config]: configOk, ...routes });
  return { provider: createActaProvider(CONFIG, { fetchImpl, ...options }), fetchImpl };
}

describe("proveedor ACTA: lecturas", () => {
  it("getStatus envía la llave, el dueño fijado por el servidor y la huella", async () => {
    const { provider, fetchImpl } = providerWith({ [ROUTE.verify]: () => jsonReply(200, { status: "valid" }) });
    assert.deepEqual(await provider.getStatus(HUELLA_VALID), { status: "valid", since: undefined });

    const call = fetchImpl.calls.find((c) => c.key === ROUTE.verify);
    assert.equal(call.url, "https://sandbox-api.acta.build/contracts/vault/verify-vc");
    assert.equal(call.headers["x-acta-key"], CONFIG.actaApiKey);
    assert.deepEqual(JSON.parse(call.body), { owner: INSTITUTION_PUBLIC_KEY, vcId: HUELLA_VALID });
  });

  it("getStatus: revocada, y vc_not_found (404) cuenta como invalid", async () => {
    const revoked = providerWith({ [ROUTE.verify]: () => jsonReply(200, { status: "revoked" }) });
    assert.equal((await revoked.provider.getStatus(HUELLA_VALID)).status, "revoked");

    const missing = providerWith({
      [ROUTE.verify]: () => jsonReply(404, { error: "vc_not_found", message: "texto largo de ACTA" }),
    });
    assert.deepEqual(await missing.provider.getStatus(HUELLA_VALID), { status: "invalid" });
  });

  it("getStatus: un vault que no existe NO se confunde con credencial inexistente", async () => {
    const { provider } = providerWith({
      [ROUTE.verify]: () => jsonReply(404, { error: "vault_not_initialized" }),
    });
    await assert.rejects(
      () => provider.getStatus(HUELLA_VALID),
      (error) => error.kind === "not_found" && error.code === "vault_not_initialized",
    );
  });

  it("getStatus: estado que ACTA no documenta o cuerpo vacío es respuesta inválida", async () => {
    const strange = providerWith({ [ROUTE.verify]: () => jsonReply(200, { status: "quizas" }) });
    await assert.rejects(() => strange.provider.getStatus(HUELLA_VALID), (e) => e.kind === "invalid_response");

    const empty = providerWith({ [ROUTE.verify]: () => new Response("", { status: 200 }) });
    await assert.rejects(() => empty.provider.getStatus(HUELLA_VALID), (e) => e.kind === "invalid_response");
  });

  it("getCredential: el texto de `data` se convierte en objeto", async () => {
    const { provider } = providerWith({
      [ROUTE.get]: () =>
        jsonReply(200, {
          result: { data: storedData(), id: HUELLA_VALID, issuance_contract: VAULT_ADDRESS, issuer_did: INSTITUTION_DID },
        }),
    });
    const credential = await provider.getCredential(HUELLA_VALID);
    assert.equal(credential.issuerDid, INSTITUTION_DID);
    assert.equal(credential.issuanceContract, VAULT_ADDRESS);
    assert.equal(credential.data.credentialSubject.course, "Curso de prueba");
  });

  it("getCredential: un `data` que no es JSON queda en null (credencial no confiable)", async () => {
    for (const data of ["{roto", "[1,2]", "42", null]) {
      const { provider } = providerWith({
        [ROUTE.get]: () => jsonReply(200, { result: { data, id: HUELLA_VALID, issuer_did: INSTITUTION_DID } }),
      });
      assert.equal((await provider.getCredential(HUELLA_VALID)).data, null);
    }
  });

  it("getCredential: vc_not_found devuelve null", async () => {
    const { provider } = providerWith({ [ROUTE.get]: () => jsonReply(404, { error: "vc_not_found" }) });
    assert.equal(await provider.getCredential(HUELLA_VALID), null);
  });

  it("getVaultInfo: lee el vault del dueño fijado por el servidor", async () => {
    const { provider, fetchImpl } = providerWith({
      [ROUTE.vault]: () =>
        jsonReply(200, {
          owner: INSTITUTION_PUBLIC_KEY,
          vault_address: VAULT_ADDRESS,
          did_uri: INSTITUTION_DID,
          version: 1,
          vc_count: 3,
          denied_issuer_count: 0,
        }),
    });
    assert.deepEqual(await provider.getVaultInfo(), {
      owner: INSTITUTION_PUBLIC_KEY,
      vaultAddress: VAULT_ADDRESS,
      didUri: INSTITUTION_DID,
      version: 1,
      vcCount: 3,
    });
    assert.equal(fetchImpl.calls.find((c) => c.key === ROUTE.vault).headers["x-acta-key"], CONFIG.actaApiKey);
  });
});

describe("proveedor ACTA: errores y seguridad", () => {
  it("cada código HTTP se traduce a un tipo propio", async () => {
    const cases = [
      [401, "unauthorized"],
      [403, "forbidden"],
      [429, "rate_limited"],
      [500, "unavailable"],
      [503, "unavailable"],
      [400, "bad_request"],
      [409, "bad_request"],
    ];
    for (const [status, kind] of cases) {
      const { provider } = providerWith({ [ROUTE.verify]: () => jsonReply(status, { error: "algo" }) });
      await assert.rejects(() => provider.getStatus(HUELLA_VALID), (error) => error.kind === kind);
    }
  });

  it("el mensaje crudo de ACTA nunca llega al error", async () => {
    const { provider } = providerWith({
      [ROUTE.verify]: () =>
        jsonReply(429, { error: "rate_limit_exceeded", message: "detalle interno de ACTA", request_id: "req-123" }),
    });
    await assert.rejects(
      () => provider.getStatus(HUELLA_VALID),
      (error) => {
        assert.equal(error.message, "rate_limited");
        assert.equal(error.code, "rate_limit_exceeded");
        assert.equal(error.requestId, "req-123");
        assert.equal(JSON.stringify(error).includes("detalle interno"), false);
        return true;
      },
    );
  });

  it("un código o id de petición con formato raro se descarta", async () => {
    const { provider } = providerWith({
      [ROUTE.verify]: () => jsonReply(500, { error: "Texto con espacios y <etiquetas>", request_id: "no válido!" }),
    });
    await assert.rejects(
      () => provider.getStatus(HUELLA_VALID),
      (error) => error.code === null && error.requestId === null,
    );
  });

  it("la red caída o el tiempo agotado son 'unavailable'", async () => {
    const down = createActaProvider(CONFIG, {
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await assert.rejects(() => down.getNetworkInfo(), (e) => e.kind === "unavailable");

    // AbortSignal.timeout no mantiene vivo el proceso (un socket real sí); este temporizador lo hace en la prueba.
    const slow = createActaProvider(CONFIG, {
      timeoutMs: 20,
      fetchImpl: (url, init) =>
        new Promise((resolve, reject) => {
          const keepAlive = setTimeout(() => resolve(jsonReply(200, {})), 2000);
          init.signal.addEventListener("abort", () => {
            clearTimeout(keepAlive);
            reject(init.signal.reason);
          });
        }),
    });
    await assert.rejects(() => slow.getNetworkInfo(), (e) => e.kind === "unavailable");
  });

  it("solo testnet: si ACTA dice otra red, se niega y no consulta nada más", async () => {
    const fetchImpl = createFakeFetch({
      [ROUTE.config]: () => jsonReply(200, { networkType: "mainnet" }),
      [ROUTE.verify]: () => jsonReply(200, { status: "valid" }),
    });
    const provider = createActaProvider(CONFIG, { fetchImpl });
    await assert.rejects(() => provider.getStatus(HUELLA_VALID), (e) => e.kind === "wrong_network");
    await assert.rejects(() => provider.getCredential(HUELLA_VALID), (e) => e.kind === "wrong_network");
    await assert.rejects(() => provider.getVaultInfo(), (e) => e.kind === "wrong_network");
    assert.equal(fetchImpl.calls.some((c) => c.key === ROUTE.verify), false);
  });

  it("la red se comprueba una sola vez mientras sea testnet", async () => {
    const { provider, fetchImpl } = providerWith({ [ROUTE.verify]: () => jsonReply(200, { status: "valid" }) });
    await provider.getStatus(HUELLA_VALID);
    await provider.getStatus(HUELLA_VALID);
    assert.equal(fetchImpl.calls.filter((c) => c.key === ROUTE.config).length, 1);
  });

  it("la llave de ACTA no se envía al resolver de DIDs ni a /config", async () => {
    const fetchImpl = createFakeFetch({
      [ROUTE.config]: configOk,
      "GET /health": () => jsonReply(200, RESOLVER_HEALTH),
      [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () => jsonReply(200, {}),
    });
    const provider = createActaProvider(CONFIG, { fetchImpl });
    await provider.getNetworkInfo();
    await provider.getResolverInfo();
    await provider.resolveDid(INSTITUTION_DID);
    for (const call of fetchImpl.calls) {
      assert.equal("x-acta-key" in call.headers, false, call.key);
    }
  });
});

describe("proveedor ACTA: red y resolver de DIDs", () => {
  it("getNetworkInfo entrega la red y el registro de DIDs de la API", async () => {
    const { provider } = providerWith({});
    assert.deepEqual(await provider.getNetworkInfo(), { networkType: "testnet", registryId: REGISTRY_ID });
  });

  it("getNetworkInfo: sin networkType es respuesta inválida", async () => {
    const provider = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ [ROUTE.config]: () => jsonReply(200, { otra: "cosa" }) }),
    });
    await assert.rejects(() => provider.getNetworkInfo(), (e) => e.kind === "invalid_response");
  });

  it("getResolverInfo: lee el registro de testnet de la respuesta real del resolver", async () => {
    const provider = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ "GET /health": () => jsonReply(200, RESOLVER_HEALTH) }),
    });
    assert.deepEqual(await provider.getResolverInfo(), { registryId: REGISTRY_ID });
  });

  it("getResolverInfo: sin networks.testnet válido no inventa nada (null), y nunca toma el de mainnet", async () => {
    const bodies = [
      { status: "ok" },
      { networks: {} },
      { networks: { mainnet: RESOLVER_HEALTH.networks.mainnet } },
      { networks: { testnet: "no-es-un-contrato" } },
      { networks: { testnet: OLD_REGISTRY_ID.slice(0, 20) } },
    ];
    for (const body of bodies) {
      const provider = createActaProvider(CONFIG, {
        fetchImpl: createFakeFetch({ "GET /health": () => jsonReply(200, body) }),
      });
      assert.equal((await provider.getResolverInfo()).registryId, null);
    }
  });

  it("resolveDid: documento DID con referencia a #auth-1", async () => {
    const document = {
      didDocument: {
        id: INSTITUTION_DID,
        controller: INSTITUTION_PUBLIC_KEY,
        verificationMethod: [
          { id: `${INSTITUTION_DID}#auth-1`, type: "Multikey", publicKeyMultibase: INSTITUTION_KEY_MULTIBASE },
        ],
        authentication: ["#auth-1"],
      },
      didDocumentMetadata: { deactivated: false },
    };
    const provider = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () => jsonReply(200, document) }),
    });
    assert.deepEqual(await provider.resolveDid(INSTITUTION_DID), {
      controller: INSTITUTION_PUBLIC_KEY,
      authenticationKeys: [INSTITUTION_PUBLIC_KEY],
      deactivated: false,
    });
  });

  it("resolveDid: registro con la clave incrustada en authentication", async () => {
    const record = {
      controller: INSTITUTION_PUBLIC_KEY,
      authentication: [{ publicKeyMultibase: INSTITUTION_KEY_MULTIBASE }],
      assertionMethod: [],
    };
    const provider = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () => jsonReply(200, record) }),
    });
    const resolved = await provider.resolveDid(INSTITUTION_DID);
    assert.deepEqual(resolved.authenticationKeys, [INSTITUTION_PUBLIC_KEY]);
  });

  it("resolveDid: 404 es null, 410 es desactivado, un DID mal formado no sale a la red", async () => {
    const missing = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () => jsonReply(404, {}) }),
    });
    assert.equal(await missing.resolveDid(INSTITUTION_DID), null);

    const gone = createActaProvider(CONFIG, {
      fetchImpl: createFakeFetch({ [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () => jsonReply(410, {}) }),
    });
    assert.equal((await gone.resolveDid(INSTITUTION_DID)).deactivated, true);

    const fetchImpl = createFakeFetch({});
    const strict = createActaProvider(CONFIG, { fetchImpl });
    await assert.rejects(() => strict.resolveDid("did:web:ejemplo.com/../x"), (e) => e.kind === "bad_request");
    assert.equal(fetchImpl.calls.length, 0);
  });

  it("extractAuthenticationKeys ignora claves que no puede leer", () => {
    const keys = extractAuthenticationKeys({
      id: "did:x",
      verificationMethod: [{ id: "did:x#a", publicKeyMultibase: FOREIGN_KEY_MULTIBASE }],
      authentication: ["#a", "#no-existe", { publicKeyMultibase: "zRoto" }, 42],
    });
    assert.deepEqual(keys, [FOREIGN_PUBLIC_KEY]);
  });
});
