import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import auth from "../../api/auth/[action].js";
import panel from "../../api/panel/[action].js";
import verify from "../../api/verify/[huella].js";
import { getRuntime, resetRuntime } from "../../api/_lib/runtime.js";
import { createSessionToken } from "../../api/_lib/session.js";
import { createTicket } from "../../api/_lib/ticket.js";
import {
  ENV,
  HUELLA_FOREIGN,
  HUELLA_VALID,
  INSTITUTION_DID,
  REGISTRY_ID,
  VAULT_ADDRESS,
  createFakeFetch,
  jsonReply,
} from "../fixtures.js";
import { buildInvokeXdr, createFakeRpc, issueArgs, randomKeypair, resultCode, revokeArgs } from "../txFixtures.js";

const ORIGIN = "https://stellar-verify.test";
const COURSE = "Curso de prueba del panel";
const originalFetch = globalThis.fetch;
const originalLog = console.log;
const institution = randomKeypair();
const publicKey = institution.publicKey();
const env = { ...ENV, INSTITUTION_PUBLIC_KEY: publicKey };

let acta;
let rpc;
let logged;

function useEnv(values) {
  for (const name of Object.keys(ENV)) delete process.env[name];
  Object.assign(process.env, values);
  resetRuntime();
}

// ACTA simulado: prepara con XDR reales (sin firmar), como lo hace la API, y recuerda lo que recibe.
function createActa() {
  const state = {
    status: "invalid",
    lastIssue: null,
    lastRevoke: null,
    prepareError: null,
    submitError: null, // si se define, el envío por la API de ACTA falla con esta respuesta
    autoApply: true, // un envío por la API que sale bien cambia el estado en la "red"
    submitted: [],
    submitHeaders: [],
  };
  const TX_ID = "ab".repeat(32);
  state.txId = TX_ID;
  const prepareXdr = (functionName, args) =>
    buildInvokeXdr({ source: publicKey, sign: null, functionName, args });

  state.routes = {
    "GET /config": () => jsonReply(200, { networkType: "testnet", didStellarRegistryId: REGISTRY_ID }),
    [`GET /contracts/vault/${publicKey}`]: () =>
      jsonReply(200, { owner: publicKey, vault_address: VAULT_ADDRESS, did_uri: INSTITUTION_DID, version: 1, vc_count: 0 }),
    "POST /contracts/vault/verify-vc": () => jsonReply(200, { status: state.status }),
    "POST /contracts/vault/get-vc": () =>
      jsonReply(200, {
        result: { data: state.lastIssue?.vcData ?? "{}", id: state.lastIssue?.vcId, issuance_contract: VAULT_ADDRESS, issuer_did: INSTITUTION_DID },
      }),
    "POST /contracts/vc/issue": ({ init }) => {
      const body = JSON.parse(init.body);
      if (body.signedXdr) {
        state.submitted.push(body);
        state.submitHeaders.push(init.headers);
        if (state.submitError) return state.submitError();
        if (state.autoApply) state.status = "valid";
        return jsonReply(201, { tx_id: TX_ID });
      }
      state.lastIssue = body;
      if (state.prepareError) return state.prepareError();
      return jsonReply(200, {
        xdr: prepareXdr("issue", issueArgs({ source: publicKey, huella: body.vcId, vcData: body.vcData })),
        network: Networks.TESTNET,
      });
    },
    "POST /contracts/vc/revoke": ({ init }) => {
      const body = JSON.parse(init.body);
      if (body.signedXdr) {
        state.submitted.push(body);
        state.submitHeaders.push(init.headers);
        if (state.submitError) return state.submitError();
        if (state.autoApply) state.status = "revoked";
        return jsonReply(201, { tx_id: TX_ID });
      }
      state.lastRevoke = body;
      if (state.prepareError) return state.prepareError();
      return jsonReply(200, { xdr: prepareXdr("revoke", revokeArgs({ huella: body.vcId, date: body.date })), network: Networks.TESTNET });
    },
  };
  return state;
}

function seedRuntime() {
  resetRuntime();
  getRuntime(process.env, { rpcFactory: () => rpc, sleep: async () => {}, pollAttempts: 2 });
}

function request(path, { method = "GET", body, cookie, headers = {}, base = ORIGIN } = {}) {
  const init = { method, headers: { ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (method === "POST") {
    init.headers["content-type"] = "application/json";
    init.headers["x-sv-request"] = "1";
    init.body = typeof body === "string" ? body : JSON.stringify(body ?? {});
  }
  return new Request(`${base}${path}`, init);
}

async function login(base = ORIGIN) {
  const challenge = await (await auth.fetch(request("/api/auth/challenge", { method: "POST", base }))).json();
  const signature = Buffer.from(institution.signMessage(challenge.message)).toString("base64");
  const response = await auth.fetch(
    request("/api/auth/verify", {
      method: "POST",
      base,
      body: { nonce: challenge.nonce, expiresAt: challenge.expiresAt, tag: challenge.tag, signature },
    }),
  );
  return { response, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] };
}

function sign(xdr, signer = institution) {
  const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  transaction.sign(signer);
  return transaction.toXDR();
}

const call = (route, path, options) => route.fetch(request(path, options));

beforeEach(() => {
  logged = [];
  console.log = (...args) => logged.push(args.join(" "));
  useEnv(env);
  acta = createActa();
  globalThis.fetch = createFakeFetch(acta.routes);
  rpc = createFakeRpc();
  seedRuntime();
});

afterEach(() => {
  console.log = originalLog;
  globalThis.fetch = originalFetch;
  for (const name of Object.keys(ENV)) delete process.env[name];
  resetRuntime();
});

describe("entrar al panel (reto firmado)", () => {
  it("el flujo completo: reto → firma → sesión en cookie → la sesión se reconoce", async () => {
    const { response, cookie } = await login();
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.publicKey, publicKey);
    assert.equal(body.institutionName, "Institucion de prueba");

    const setCookie = response.headers.get("set-cookie");
    for (const part of ["HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=1800", "Secure"]) assert.ok(setCookie.includes(part), part);

    const info = await (await call(auth, "/api/auth/session", { cookie })).json();
    assert.equal(info.authenticated, true);
    assert.equal(info.publicKey, publicKey);
  });

  it("en localhost (http) la cookie no puede ser Secure, y sigue siendo HttpOnly y Strict", async () => {
    const { response } = await login("http://localhost:5173");
    const setCookie = response.headers.get("set-cookie");
    assert.equal(setCookie.includes("Secure"), false);
    assert.ok(setCookie.includes("HttpOnly") && setCookie.includes("SameSite=Strict"));
  });

  it("sin cookie, la sesión es 'no autenticado'", async () => {
    assert.deepEqual(await (await call(auth, "/api/auth/session")).json(), { authenticated: false });
  });

  it("una firma de otra cuenta, o un reto caducado, no entran y no dan pistas", async () => {
    const challenge = await (await auth.fetch(request("/api/auth/challenge", { method: "POST" }))).json();
    const stranger = Buffer.from(randomKeypair().signMessage(challenge.message)).toString("base64");
    const wrong = await auth.fetch(
      request("/api/auth/verify", { method: "POST", body: { ...challenge, signature: stranger } }),
    );
    assert.equal(wrong.status, 401);
    assert.deepEqual(await wrong.json(), { error: "firma_invalida" });

    const { createChallenge } = await import("../../api/_lib/session.js");
    const old = createChallenge({ secret: env.SESSION_SECRET, host: "stellar-verify.test", now: Date.now() - 10 * 60 * 1000 });
    const signature = Buffer.from(institution.signMessage(old.message)).toString("base64");
    const expired = await auth.fetch(request("/api/auth/verify", { method: "POST", body: { ...old, signature } }));
    assert.equal(expired.status, 401);
    assert.deepEqual(await expired.json(), { error: "reto_expirado" });
  });

  it("salir borra la cookie", async () => {
    const { cookie } = await login();
    const response = await call(auth, "/api/auth/logout", { method: "POST", cookie });
    assert.ok(response.headers.get("set-cookie").includes("Max-Age=0"));
    assert.deepEqual(await response.json(), { authenticated: false });
  });

  it("las rutas de entrada también exigen la cabecera propia y el mismo origen", async () => {
    const noHeader = await auth.fetch(new Request(`${ORIGIN}/api/auth/challenge`, { method: "POST" }));
    assert.equal(noHeader.status, 403);
    const foreign = await auth.fetch(request("/api/auth/challenge", { method: "POST", headers: { origin: "https://otro-sitio.test" } }));
    assert.equal(foreign.status, 403);
    assert.equal((await call(auth, "/api/auth/challenge")).status, 405);
    assert.equal((await call(auth, "/api/auth/nada")).status, 404);
  });

  it("sin SESSION_SECRET (o muy corto) el panel no abre, pero la verificación pública sigue", async () => {
    for (const secret of [undefined, "corto"]) {
      const { SESSION_SECRET, ...rest } = env;
      useEnv(secret ? { ...rest, SESSION_SECRET: secret } : rest);
      seedRuntime();
      const challenge = await auth.fetch(request("/api/auth/challenge", { method: "POST" }));
      assert.equal(challenge.status, 503);
      assert.deepEqual(await challenge.json(), { error: "sesion_no_configurada" });
      assert.equal((await call(panel, "/api/panel/status?huella=x&expect=valid")).status, 503);
    }
    acta.status = "invalid";
    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "no_encontrada");
  });
});

describe("acceso al panel", () => {
  const actions = [
    ["POST", "/api/panel/issue-prepare"],
    ["POST", "/api/panel/issue-submit"],
    ["POST", "/api/panel/revoke-prepare"],
    ["POST", "/api/panel/revoke-submit"],
    ["GET", `/api/panel/status?huella=${HUELLA_VALID}&expect=valid`],
    ["GET", "/api/panel/no-existe"],
  ];

  it("sin sesión TODAS las rutas del panel responden 401", async () => {
    for (const [method, path] of actions) {
      const response = await call(panel, path, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.equal((await response.json()).error, "no_autenticado");
    }
  });

  it("una cookie alterada, de otro secreto o caducada tampoco entra", async () => {
    const { cookie } = await login();
    const tampered = `${cookie.slice(0, -3)}abc`;
    const otherSecret = `sv_session=${createSessionToken({ secret: "otro-secreto-distinto-0123456789-abcdef" }).token}`;
    const old = `sv_session=${createSessionToken({ secret: env.SESSION_SECRET, now: Date.now() - 31 * 60 * 1000 }).token}`;
    for (const bad of [tampered, otherSecret, old]) {
      const response = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie: bad, body: {} });
      assert.equal(response.status, 401);
    }
  });

  it("con sesión, las escrituras exigen la cabecera propia y el mismo origen", async () => {
    const { cookie } = await login();
    const noHeader = await panel.fetch(
      new Request(`${ORIGIN}/api/panel/issue-prepare`, { method: "POST", headers: { cookie }, body: "{}" }),
    );
    assert.equal(noHeader.status, 403);
    assert.equal((await noHeader.json()).error, "peticion_no_permitida");

    const foreign = await call(panel, "/api/panel/issue-prepare", {
      method: "POST",
      cookie,
      headers: { origin: "https://sitio-malo.test" },
      body: { huella: HUELLA_VALID, course: COURSE, issueDate: "2026-10-16" },
    });
    assert.equal(foreign.status, 403);
    assert.equal((await foreign.json()).error, "origen_no_permitido");
    assert.equal(acta.lastIssue, null);
  });

  it("método incorrecto, ruta inexistente, cuerpo ilegible o demasiado grande", async () => {
    const { cookie } = await login();
    assert.equal((await call(panel, "/api/panel/issue-prepare", { cookie })).status, 405);
    assert.equal((await call(panel, `/api/panel/status?huella=${HUELLA_VALID}&expect=valid`, { method: "POST", cookie })).status, 405);
    assert.equal((await call(panel, "/api/panel/no-existe", { cookie })).status, 404);
    assert.equal((await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body: "{roto" })).status, 400);
    assert.equal((await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body: "[]" })).status, 400);
    const big = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body: JSON.stringify({ x: "a".repeat(21 * 1024) }) });
    assert.equal(big.status, 413);
  });
});

// Prepara una emisión como lo haría la pantalla y devuelve lo que entrega el servidor.
async function prepareIssue(cookie, huella = HUELLA_VALID) {
  const response = await call(panel, "/api/panel/issue-prepare", {
    method: "POST",
    cookie,
    body: { huella, course: COURSE, issueDate: "2026-10-16" },
  });
  assert.equal(response.status, 200);
  return response.json();
}

const submitIssue = (cookie, body) => call(panel, "/api/panel/issue-submit", { method: "POST", cookie, body });
const API_FAILS = () => jsonReply(500, { error: "tx_submit_error", message: "Internal server error" });

describe("emitir", () => {
  it("el flujo completo: preparar → firmar → enviar por la API de ACTA → confirmar → la verificación pública dice 'válida'", async () => {
    const { cookie } = await login();

    // Antes de emitir, la verificación pública dice "no encontrada" (y lo guarda en caché 30 s).
    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "no_encontrada");

    const { xdr, networkPassphrase, expiresAt, ticket } = await prepareIssue(cookie);
    assert.equal(networkPassphrase, Networks.TESTNET);
    assert.ok(Date.parse(expiresAt) > Date.now(), "la transacción preparada todavía no caducó");
    assert.ok(ticket.includes("."), "la preparación entrega un ticket");

    const submitted = await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket });
    assert.equal(submitted.status, 200);
    assert.deepEqual(await submitted.json(), { txId: acta.txId, confirmed: true });
    assert.equal(acta.submitted.length, 1, "se envió por la API de ACTA");
    assert.equal(rpc.sent.length, 0, "el respaldo por la red no hizo falta");
    assert.ok(logged.some((line) => line === JSON.stringify({ event: "submit", operation: "issue", via: "api", confirmed: true })), "el registro dice que salió por la API");

    // La caché de esta instancia se olvidó: la verificación pública ya ve la credencial.
    const verified = await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.deepEqual(verified, { estado: "valida", institucion: "Institucion de prueba", curso: COURSE, fecha: "2026-10-16" });
  });

  it("al enviar, ACTA recibe el cuerpo de la preparación (fijado por el servidor) + signedXdr + Idempotency-Key", async () => {
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const signedXdr = sign(xdr);
    await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr, ticket, owner: "GATACANTE", vcData: "{\"falso\":1}" });

    const sent = acta.submitted[0];
    assert.deepEqual(sent, { ...acta.lastIssue, signedXdr }, "mismo cuerpo que al preparar, más la firma");
    assert.equal(sent.owner, publicKey);
    assert.equal(JSON.stringify(sent).includes("falso"), false, "lo que mande el navegador no entra");
    assert.equal(acta.submitHeaders[0]["idempotency-key"].length, 64);
    assert.equal(acta.submitHeaders[0]["x-acta-key"], env.ACTA_API_KEY);
  });

  it("si la API de ACTA falla al enviar, se reintenta por la red de Stellar (respaldo)", async () => {
    rpc = createFakeRpc({
      send: (tx) => {
        acta.status = "valid";
        return { status: "PENDING", hash: Buffer.from(tx.hash()).toString("hex") };
      },
    });
    seedRuntime();
    acta.submitError = API_FAILS;
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const result = await (await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket })).json();
    assert.match(result.txId, /^[0-9a-f]{64}$/);
    assert.equal(result.confirmed, true);
    assert.equal(rpc.sent.length, 1);
    assert.ok(logged.some((line) => line.includes('"event":"submit"') && line.includes('"via":"rpc"')), "el registro dice que salió por el respaldo");
  });

  it("si la API falló pero la operación SÍ entró, no se reenvía: confirmed true, sin hash", async () => {
    acta.submitError = API_FAILS;
    acta.status = "valid";
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const result = await (await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket })).json();
    assert.deepEqual(result, { txId: null, confirmed: true });
    assert.equal(rpc.sent.length, 0);
  });

  it("el servidor fija owner, issuer y DID al preparar: lo que mande el navegador se ignora", async () => {
    const { cookie } = await login();
    await call(panel, "/api/panel/issue-prepare", {
      method: "POST",
      cookie,
      body: {
        huella: HUELLA_VALID,
        course: COURSE,
        issueDate: "2026-10-16",
        owner: "GATACANTE",
        issuer: "GATACANTE",
        sourcePublicKey: "GATACANTE",
        issuerDid: "did:stellar:testnet:atacante",
        titular: "María Ejemplo",
      },
    });
    assert.equal(acta.lastIssue.owner, publicKey);
    assert.equal(acta.lastIssue.issuer, publicKey);
    assert.equal(acta.lastIssue.sourcePublicKey, publicKey);
    assert.equal(acta.lastIssue.issuerDid, INSTITUTION_DID);
    assert.equal(acta.lastIssue.vcId, HUELLA_VALID);
    assert.equal(JSON.stringify(acta.lastIssue).includes("María"), false);
    assert.equal(JSON.stringify(acta.lastIssue).toLowerCase().includes("atacante"), false);
  });

  it("el vcData que sale hacia ACTA no lleva datos personales", async () => {
    const { cookie } = await login();
    await call(panel, "/api/panel/issue-prepare", {
      method: "POST",
      cookie,
      body: { huella: HUELLA_VALID, course: COURSE, issueDate: "2026-10-16", email: "a@b.co", document: "123" },
    });
    const data = JSON.parse(acta.lastIssue.vcData);
    assert.deepEqual(Object.keys(data.credentialSubject).sort(), ["course", "id", "institution", "issueDate"]);
  });

  it("datos inválidos: 400 con el campo", async () => {
    const { cookie } = await login();
    const cases = [
      [{ huella: "abc", course: COURSE, issueDate: "2026-10-16" }, "huella"],
      [{ huella: HUELLA_VALID, course: "", issueDate: "2026-10-16" }, "course"],
      [{ huella: HUELLA_VALID, course: "x".repeat(121), issueDate: "2026-10-16" }, "course"],
      [{ huella: HUELLA_VALID, course: COURSE, issueDate: "2026-02-31" }, "issueDate"],
    ];
    for (const [body, field] of cases) {
      const response = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body });
      assert.equal(response.status, 400);
      const payload = await response.json();
      assert.equal(payload.error, "datos_invalidos");
      assert.equal(payload.field, field);
    }
    assert.equal(acta.lastIssue, null, "con datos inválidos no se llama a ACTA");
  });

  it("un XDR que no es lo preparado NO se envía a ningún lado", async () => {
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);

    const foreignSigned = buildInvokeXdr({ source: publicKey, sign: randomKeypair(), functionName: "issue", args: issueArgs({ source: publicKey, huella: HUELLA_VALID }) });
    const otherHuella = buildInvokeXdr({ source: publicKey, sign: institution, functionName: "issue", args: issueArgs({ source: publicKey, huella: HUELLA_FOREIGN }) });
    const otherFunction = buildInvokeXdr({ source: publicKey, sign: institution, functionName: "revoke", args: revokeArgs({ huella: HUELLA_VALID }) });
    const otherSource = randomKeypair();
    const otherSourceXdr = buildInvokeXdr({ source: otherSource.publicKey(), sign: otherSource, functionName: "issue", args: issueArgs({ source: publicKey, huella: HUELLA_VALID }) });

    for (const signedXdr of [xdr /* sin firmar */, foreignSigned, otherHuella, otherFunction, otherSourceXdr, "basura"]) {
      const response = await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr, ticket });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "xdr_invalido");
    }
    assert.equal(acta.submitted.length, 0, "ACTA no recibió nada");
    assert.equal(rpc.sent.length, 0, "la red no recibió nada");
  });

  it("el ticket no se puede alterar, reutilizar con otra huella u operación, ni usar caducado", async () => {
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const signedXdr = sign(xdr);
    const [payload, tag] = ticket.split(".");

    // Un ticket armado a mano con otro cuerpo (por ejemplo, otro vcData) no tiene la firma del servidor.
    const forgedPayload = Buffer.from(JSON.stringify({ op: "issue", req: { ...acta.lastIssue, vcData: "{}" }, exp: Date.now() + 60_000 })).toString("base64url");
    const old = createTicket({ secret: env.SESSION_SECRET, operation: "issue", request: acta.lastIssue, now: Date.now() - 10 * 60 * 1000 });
    const revokeTicket = createTicket({ secret: env.SESSION_SECRET, operation: "revoke", request: acta.lastIssue });
    const otherHuellaTicket = createTicket({ secret: env.SESSION_SECRET, operation: "issue", request: { ...acta.lastIssue, vcId: HUELLA_FOREIGN } });

    const cases = [
      [`${forgedPayload}.${tag}`, "xdr_invalido"],
      [`${payload}.${tag.slice(0, -2)}AA`, "xdr_invalido"],
      [revokeTicket, "xdr_invalido"],
      [otherHuellaTicket, "xdr_invalido"],
      ["basura", "xdr_invalido"],
      [undefined, "xdr_invalido"],
      [old, "expirada"],
    ];
    for (const [badTicket, error] of cases) {
      const response = await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr, ticket: badTicket });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, error);
    }
    assert.equal(acta.submitted.length, 0);
    assert.equal(rpc.sent.length, 0);
  });

  it("firmar y enviar tarde: la transacción caducada se rechaza y se pide volver a preparar", async () => {
    const { cookie } = await login();
    const { ticket } = await prepareIssue(cookie);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const late = buildInvokeXdr({
      source: publicKey,
      sign: institution,
      functionName: "issue",
      args: issueArgs({ source: publicKey, huella: HUELLA_VALID }),
      timeBounds: { min: 0, max: nowSeconds - 30 },
    });
    const response = await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: late, ticket });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "expirada", retryable: true });
    assert.equal(acta.submitted.length, 0);
  });

  it("si la API falla y la red dice que ya caducó o que falló, la respuesta es un código claro", async () => {
    acta.submitError = API_FAILS;
    const cases = [
      [{ send: { status: "ERROR", hash: "x", errorResult: resultCode("txTooLate") } }, 400, { error: "expirada", retryable: true }],
      [{ results: [{ status: "FAILED", resultXdr: resultCode("txFailed") }] }, 422, { error: "tx_rechazada", retryable: false }],
      [{ send: { status: "ERROR", hash: "x", errorResult: resultCode("txInsufficientBalance") } }, 402, { error: "fondos_insuficientes", retryable: false }],
    ];
    for (const [rpcOptions, status, expected] of cases) {
      rpc = createFakeRpc(rpcOptions);
      seedRuntime();
      const { cookie } = await login();
      const { xdr, ticket } = await prepareIssue(cookie);
      const response = await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket });
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), expected);
    }
  });

  it("si la operación tarda en verse, devuelve confirmed=false y la pantalla sigue esperando con /status", async () => {
    acta.autoApply = false;
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const result = await (await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket })).json();
    assert.equal(result.txId, acta.txId);
    assert.equal(result.confirmed, false);

    const waiting = await (await call(panel, `/api/panel/status?huella=${HUELLA_VALID}&expect=valid`, { cookie })).json();
    assert.deepEqual(waiting, { confirmed: false });
    acta.status = "valid";
    const done = await (await call(panel, `/api/panel/status?huella=${HUELLA_VALID}&expect=valid`, { cookie })).json();
    assert.deepEqual(done, { confirmed: true });
  });

  it("los errores de ACTA se traducen a códigos propios, sin su mensaje", async () => {
    const { cookie } = await login();
    const body = { huella: HUELLA_VALID, course: COURSE, issueDate: "2026-10-16" };
    const cases = [
      [() => jsonReply(409, { error: "vc_already_exists", message: "detalle interno de ACTA" }), 409, "duplicada", false],
      [() => jsonReply(429, { error: "write_rate_limit_exceeded" }), 429, "limite", true],
      [() => jsonReply(500, { error: "tx_submit_error", message: "Internal server error" }), 503, "no_disponible", true],
      [() => jsonReply(401, { error: "unauthorized" }), 502, "clave_rechazada", false],
      [() => jsonReply(403, { error: "insufficient_scope" }), 502, "clave_rechazada", false],
      [() => jsonReply(403, { error: "issuer_not_authorized" }), 403, "emisor_bloqueado", false],
      [() => jsonReply(200, { sin: "xdr" }), 502, "respuesta_inesperada", true],
      [() => jsonReply(200, { xdr: "AAAA", network: "Public Global Stellar Network ; September 2015" }), 502, "respuesta_inesperada", true],
    ];
    for (const [reply, status, error, retryable] of cases) {
      acta.prepareError = reply;
      const response = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body });
      const text = await response.text();
      assert.equal(response.status, status, error);
      assert.deepEqual(JSON.parse(text), { error, retryable });
      assert.equal(text.includes("detalle interno"), false);
    }
  });

  it("el registro técnico dice en qué paso falló, pero no lleva el XDR, el ticket, el curso, la cookie ni la llave", async () => {
    const { cookie } = await login();
    const { xdr, ticket } = await prepareIssue(cookie);
    const signedXdr = sign(xdr);
    acta.submitError = API_FAILS;
    await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr, ticket });
    await submitIssue(cookie, { huella: HUELLA_VALID, signedXdr: "basura", ticket });

    const text = logged.join("\n");
    for (const secret of [signedXdr, xdr, ticket, COURSE, "credentialSubject", cookie.split("=")[1], env.ACTA_API_KEY, env.SESSION_SECRET, HUELLA_VALID]) {
      assert.equal(text.includes(secret), false, secret.slice(0, 16));
    }
    assert.ok(text.includes('"route":"panel"'));
    assert.ok(text.includes('"operation":"submit-api"'), "el registro dice que falló el envío por la API");
  });
});

describe("revocar", () => {
  async function prepareRevoke(cookie) {
    const prepared = await call(panel, "/api/panel/revoke-prepare", { method: "POST", cookie, body: { huella: HUELLA_VALID, owner: "GATACANTE" } });
    assert.equal(prepared.status, 200);
    return prepared.json();
  }

  it("el flujo completo: preparar → firmar → enviar por la API → la verificación pública dice 'revocada'", async () => {
    const { cookie } = await login();
    acta.status = "valid";
    acta.lastIssue = { vcId: HUELLA_VALID, vcData: JSON.stringify({ credentialSubject: { institution: "Institucion de prueba", course: COURSE, issueDate: "2026-10-16" } }) };
    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "valida");

    const { xdr, ticket } = await prepareRevoke(cookie);
    assert.equal(acta.lastRevoke.owner, publicKey, "lo que mande el navegador se ignora");
    assert.equal(acta.lastRevoke.sourcePublicKey, publicKey);
    assert.equal(acta.lastRevoke.vcId, HUELLA_VALID);
    assert.ok(!Number.isNaN(Date.parse(acta.lastRevoke.date)), "la fecha es ISO completa y la pone el servidor");

    const submitted = await (await call(panel, "/api/panel/revoke-submit", { method: "POST", cookie, body: { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket } })).json();
    assert.deepEqual(submitted, { txId: acta.txId, confirmed: true });
    assert.equal(acta.submitted[0].date, acta.lastRevoke.date, "se envía la misma fecha con que se preparó");
    assert.equal(rpc.sent.length, 0);

    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "revocada");
  });

  it("revocar con un XDR de issue o con el ticket de otra operación se rechaza", async () => {
    const { cookie } = await login();
    const { ticket } = await prepareRevoke(cookie);
    const issueXdr = buildInvokeXdr({ source: publicKey, sign: institution, functionName: "issue", args: issueArgs({ source: publicKey, huella: HUELLA_VALID }) });
    const wrongFunction = await call(panel, "/api/panel/revoke-submit", { method: "POST", cookie, body: { huella: HUELLA_VALID, signedXdr: issueXdr, ticket } });
    assert.equal(wrongFunction.status, 400);

    const { xdr, ticket: issueTicket } = await prepareIssue(cookie);
    const wrongTicket = await call(panel, "/api/panel/revoke-submit", { method: "POST", cookie, body: { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket: issueTicket } });
    assert.equal(wrongTicket.status, 400);
    assert.equal(acta.submitted.length, 0);
    assert.equal(rpc.sent.length, 0);
  });

  it("ya revocada o inexistente: códigos propios", async () => {
    const { cookie } = await login();
    for (const [code, status, error] of [["vc_already_revoked", 409, "ya_revocada"], ["vc_not_found", 404, "no_existe"]]) {
      acta.prepareError = () => jsonReply(status, { error: code });
      const response = await call(panel, "/api/panel/revoke-prepare", { method: "POST", cookie, body: { huella: HUELLA_VALID } });
      assert.equal(response.status, status);
      assert.equal((await response.json()).error, error);
    }
  });

  it("status valida sus parámetros", async () => {
    const { cookie } = await login();
    assert.equal((await call(panel, `/api/panel/status?huella=${HUELLA_VALID}&expect=otra`, { cookie })).status, 400);
    assert.equal((await call(panel, "/api/panel/status?huella=abc&expect=valid", { cookie })).status, 400);
  });
});

describe("credential (lectura fresca del panel)", () => {
  const stored = () => ({ vcId: HUELLA_VALID, vcData: JSON.stringify({ credentialSubject: { institution: "Institucion de prueba", course: COURSE, issueDate: "2026-10-16" } }) });

  it("exige sesión", async () => {
    const response = await call(panel, `/api/panel/credential?huella=${HUELLA_VALID}`);
    assert.equal(response.status, 401);
  });

  it("huella inválida: 400", async () => {
    const { cookie } = await login();
    assert.equal((await call(panel, "/api/panel/credential?huella=abc", { cookie })).status, 400);
    assert.equal((await call(panel, "/api/panel/credential", { cookie })).status, 400);
  });

  it("lee sin caché: ve el cambio aunque la verificación pública siga con el dato viejo", async () => {
    const { cookie } = await login();
    acta.status = "valid";
    acta.lastIssue = stored();
    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "valida", "la pública la deja en caché");

    // Otra función (otra instancia) revoca: esta instancia no se entera y su caché pública sigue con "válida".
    acta.status = "revoked";
    assert.equal((await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json()).estado, "valida", "caché pública vieja");

    const fresh = await (await call(panel, `/api/panel/credential?huella=${HUELLA_VALID}`, { cookie })).json();
    assert.equal(fresh.estado, "revocada", "el panel lee fresco");
  });

  it("antes de emitir no deja 'no encontrada' en la caché pública", async () => {
    const { cookie } = await login();
    acta.status = "invalid";
    const before = await (await call(panel, `/api/panel/credential?huella=${HUELLA_VALID}`, { cookie })).json();
    assert.equal(before.estado, "no_encontrada");

    acta.status = "valid";
    acta.lastIssue = stored();
    const publicRead = await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.equal(publicRead.estado, "valida", "la pública no heredó el dato del panel");
  });
});

describe("capa de firma del emisor (SIGNATURE_LAYER=on)", () => {
  const DATE = "2026-10-16";
  const messageFor = (huella = HUELLA_VALID) => `SV1|${huella}|${INSTITUTION_DID}|${DATE}`;
  const signText = (text, pair = institution) => Buffer.from(pair.signMessage(text)).toString("base64");
  const body = (extra = {}) => ({ huella: HUELLA_VALID, course: COURSE, issueDate: DATE, ...extra });
  const unsignedData = () =>
    JSON.stringify({
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "StellarVerifyCredential"],
      issuer: INSTITUTION_DID,
      credentialSubject: { id: "urn:uuid:3a13cd79-f623-4fea-8a77-35cf8fe2240c", institution: "Institucion de prueba", course: COURSE, issueDate: DATE },
    });

  beforeEach(() => {
    useEnv({ ...env, SIGNATURE_LAYER: "on" });
    seedRuntime();
  });

  it("issue-start entrega el texto canónico a firmar (y exige sesión y datos válidos)", async () => {
    assert.equal((await call(panel, "/api/panel/issue-start", { method: "POST", body: body() })).status, 401);

    const { cookie } = await login();
    const response = await call(panel, "/api/panel/issue-start", { method: "POST", cookie, body: body() });
    assert.deepEqual(await response.json(), { message: messageFor() });

    for (const bad of [{ huella: "abc" }, { course: "" }, { issueDate: "2026-02-31" }]) {
      const rejected = await call(panel, "/api/panel/issue-start", { method: "POST", cookie, body: body(bad) });
      assert.equal(rejected.status, 400);
    }
  });

  it("con la capa apagada issue-start responde message null y la pantalla se salta la primera firma", async () => {
    useEnv({ ...env, SIGNATURE_LAYER: "off" });
    seedRuntime();
    const { cookie } = await login();
    const response = await call(panel, "/api/panel/issue-start", { method: "POST", cookie, body: body() });
    assert.deepEqual(await response.json(), { message: null });
  });

  it("flujo completo: firma del mensaje → preparar → firma de la transacción → la verificación pública dice 'válida'", async () => {
    const { cookie } = await login();
    const signature = signText(messageFor());
    const prepared = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body: body({ signature }) });
    assert.equal(prepared.status, 200);
    const { xdr, ticket } = await prepared.json();

    const stored = JSON.parse(acta.lastIssue.vcData);
    assert.deepEqual(stored.proof, { type: "StellarSignMessageV1", signature }, "la firma viaja dentro del vcData");

    const submitted = await call(panel, "/api/panel/issue-submit", { method: "POST", cookie, body: { huella: HUELLA_VALID, signedXdr: sign(xdr), ticket } });
    assert.equal((await submitted.json()).confirmed, true);

    const verified = await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.deepEqual(verified, { estado: "valida", institucion: "Institucion de prueba", curso: COURSE, fecha: DATE });
  });

  it("preparar sin firma, con firma de otra huella, de otra fecha o de otra wallet: 400 y NO se llama a ACTA", async () => {
    const { cookie } = await login();
    const cases = [
      undefined,
      "basura",
      signText(messageFor(HUELLA_FOREIGN)),
      signText(`SV1|${HUELLA_VALID}|${INSTITUTION_DID}|2026-10-17`),
      signText(messageFor(), randomKeypair()),
    ];
    for (const signature of cases) {
      const response = await call(panel, "/api/panel/issue-prepare", { method: "POST", cookie, body: body({ signature }) });
      assert.equal(response.status, 400, String(signature).slice(0, 12));
      assert.equal((await response.json()).error, "firma_invalida");
    }
    assert.equal(acta.lastIssue, null, "ACTA no recibió nada");
  });

  it("registro hostil con el issuer_did copiado pero SIN firma: 'emisor no reconocido', sin mostrar sus datos", async () => {
    acta.status = "valid";
    acta.lastIssue = { vcId: HUELLA_VALID, vcData: unsignedData() };
    const result = await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.deepEqual(result, { estado: "emisor_no_reconocido" });
  });

  it("registro hostil con una firma copiada de otra credencial: 'emisor no reconocido'", async () => {
    const copied = signText(messageFor(HUELLA_FOREIGN));
    acta.status = "valid";
    acta.lastIssue = { vcId: HUELLA_VALID, vcData: JSON.stringify({ ...JSON.parse(unsignedData()), proof: { type: "StellarSignMessageV1", signature: copied } }) };
    assert.deepEqual(await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json(), { estado: "emisor_no_reconocido" });
  });

  it("una credencial sin firma queda 'no reconocida' también si está revocada", async () => {
    acta.status = "revoked";
    acta.lastIssue = { vcId: HUELLA_VALID, vcData: unsignedData() };
    assert.deepEqual(await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json(), { estado: "emisor_no_reconocido" });
  });

  it("una credencial bien firmada y revocada sigue saliendo 'revocada'", async () => {
    const proof = { type: "StellarSignMessageV1", signature: signText(messageFor()) };
    acta.status = "revoked";
    acta.lastIssue = { vcId: HUELLA_VALID, vcData: JSON.stringify({ ...JSON.parse(unsignedData()), proof }) };
    const result = await (await call(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.equal(result.estado, "revocada");
    assert.equal(result.curso, COURSE);
  });

  it("la salud informa que la capa está activa", async () => {
    const health = (await import("../../api/health.js")).default;
    const report = await (await health.fetch(new Request(`${ORIGIN}/api/health`))).json();
    assert.equal(report.signatureLayer, "on");
  });
});
