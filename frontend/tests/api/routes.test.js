import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import health from "../../api/health.js";
import verify from "../../api/verify/[huella].js";
import { resetRuntime } from "../../api/_lib/runtime.js";
import {
  ENV,
  FOREIGN_DID,
  HUELLA_FOREIGN,
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

const ORIGIN = "https://stellar-verify.test";
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const originalLog = console.log;
let logged;

function useEnv(env) {
  for (const name of Object.keys(ENV)) delete process.env[name];
  Object.assign(process.env, env);
  resetRuntime();
}

function actaRoutes({ issuerDid = INSTITUTION_DID, status = "valid" } = {}) {
  return {
    "GET /config": () => jsonReply(200, { networkType: "testnet", didStellarRegistryId: REGISTRY_ID }),
    "GET /health": () => jsonReply(200, RESOLVER_HEALTH),
    [`GET /contracts/vault/${INSTITUTION_PUBLIC_KEY}`]: () =>
      jsonReply(200, { owner: INSTITUTION_PUBLIC_KEY, vault_address: VAULT_ADDRESS, did_uri: INSTITUTION_DID, version: 1, vc_count: 1 }),
    "POST /contracts/vault/verify-vc": () => jsonReply(200, { status }),
    "POST /contracts/vault/get-vc": () =>
      jsonReply(200, {
        result: { data: storedData(), id: HUELLA_VALID, issuance_contract: VAULT_ADDRESS, issuer_did: issuerDid },
      }),
    [`GET /1.0/identifiers/${INSTITUTION_DID}`]: () =>
      jsonReply(200, { controller: INSTITUTION_PUBLIC_KEY, authentication: [{ publicKeyMultibase: INSTITUTION_KEY_MULTIBASE }] }),
  };
}

const get = (route, path) => route.fetch(new Request(`${ORIGIN}${path}`));

beforeEach(() => {
  logged = [];
  console.log = (...args) => logged.push(args.join(" "));
  useEnv(ENV);
});

afterEach(() => {
  console.log = originalLog;
  globalThis.fetch = originalFetch;
  for (const name of Object.keys(ENV)) {
    if (name in originalEnv) process.env[name] = originalEnv[name];
    else delete process.env[name];
  }
  resetRuntime();
});

describe("GET /api/verify/:huella", () => {
  it("huella inválida: 400 sin salir a la red", async () => {
    const fetchImpl = createFakeFetch({});
    globalThis.fetch = fetchImpl;
    for (const bad of ["abc", HUELLA_VALID.toUpperCase(), `${HUELLA_VALID}0`, "../../etc/passwd"]) {
      const response = await get(verify, `/api/verify/${bad}`);
      assert.equal(response.status, 400, bad);
      assert.deepEqual(await response.json(), { error: "huella_invalida" });
    }
    assert.equal(fetchImpl.calls.length, 0);
  });

  it("solo acepta GET", async () => {
    const response = await verify.fetch(new Request(`${ORIGIN}/api/verify/${HUELLA_VALID}`, { method: "POST", body: "{}" }));
    assert.equal(response.status, 405);
  });

  it("válida: 200 con los datos mínimos y cabeceras seguras (sin CORS)", async () => {
    globalThis.fetch = createFakeFetch(actaRoutes());
    const response = await get(verify, `/api/verify/${HUELLA_VALID}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.ok(response.headers.get("x-request-id"));
    assert.deepEqual(await response.json(), {
      estado: "valida",
      institucion: "Institucion de prueba",
      curso: "Curso de prueba",
      fecha: "2026-10-16",
    });
  });

  it("emisor ajeno: solo el estado", async () => {
    globalThis.fetch = createFakeFetch(actaRoutes({ issuerDid: FOREIGN_DID }));
    const response = await get(verify, `/api/verify/${HUELLA_FOREIGN}`);
    assert.deepEqual(await response.json(), { estado: "emisor_no_reconocido" });
  });

  it("el servidor ignora el `owner` que mande el navegador", async () => {
    const fetchImpl = createFakeFetch(actaRoutes());
    globalThis.fetch = fetchImpl;
    await get(verify, `/api/verify/${HUELLA_VALID}?owner=GATACANTE&issuer=GATACANTE&sourcePublicKey=GATACANTE`);
    const call = fetchImpl.calls.find((c) => c.key === "POST /contracts/vault/verify-vc");
    assert.equal(JSON.parse(call.body).owner, INSTITUTION_PUBLIC_KEY);
    assert.equal(fetchImpl.calls.some((c) => c.url.includes("GATACANTE") || String(c.body).includes("GATACANTE")), false);
  });

  it("ACTA caído: 'no se pudo comprobar', nunca 'no válida'", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const response = await get(verify, `/api/verify/${HUELLA_VALID}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { estado: "no_verificable" });
  });

  it("sin configuración válida: 'no se pudo comprobar' y sin salir a la red", async () => {
    useEnv({});
    const fetchImpl = createFakeFetch({});
    globalThis.fetch = fetchImpl;
    const response = await get(verify, `/api/verify/${HUELLA_VALID}`);
    assert.deepEqual(await response.json(), { estado: "no_verificable" });
    assert.equal(fetchImpl.calls.length, 0);
  });

  it("el registro técnico no contiene huellas, llaves ni datos de la credencial", async () => {
    globalThis.fetch = createFakeFetch(actaRoutes());
    await get(verify, `/api/verify/${HUELLA_VALID}`);
    const text = logged.join("\n");
    assert.ok(text.includes('"route":"verify"'));
    assert.equal(text.includes(HUELLA_VALID), false);
    assert.equal(text.includes(ENV.ACTA_API_KEY), false);
    assert.equal(text.includes("Curso de prueba"), false);
  });
});

describe("GET /api/health", () => {
  it("todo en orden", async () => {
    globalThis.fetch = createFakeFetch(actaRoutes());
    const body = await (await get(health, "/api/health")).json();
    assert.deepEqual(body, {
      ok: true,
      configured: true,
      networkType: "testnet",
      registryApi: REGISTRY_ID,
      registryResolver: REGISTRY_ID,
      registryMatch: true,
      institutionDidResolves: true,
      institutionKeyListed: true,
      vaultDidOk: true,
      session: "ok",
      signatureLayer: "off",
    });
  });

  it("sin secreto de sesión: la verificación sigue, pero la salud avisa que el panel no está listo", async () => {
    const { SESSION_SECRET, ...withoutSecret } = ENV;
    useEnv(withoutSecret);
    globalThis.fetch = createFakeFetch(actaRoutes());
    const body = await (await get(health, "/api/health")).json();
    assert.equal(body.session, "missing");
    assert.equal(body.ok, false);
    assert.equal(body.institutionDidResolves, true);

    useEnv({ ...ENV, SESSION_SECRET: "corto" });
    const short = await (await get(health, "/api/health")).json();
    assert.equal(short.session, "too_short");

    useEnv(withoutSecret);
    const verified = await (await get(verify, `/api/verify/${HUELLA_VALID}`)).json();
    assert.equal(verified.estado, "valida");
  });

  it("detecta el desajuste de registros de DIDs (H2)", async () => {
    globalThis.fetch = createFakeFetch({
      ...actaRoutes(),
      "GET /health": () =>
        jsonReply(200, { ...RESOLVER_HEALTH, networks: { ...RESOLVER_HEALTH.networks, testnet: OLD_REGISTRY_ID } }),
    });
    const body = await (await get(health, "/api/health")).json();
    assert.equal(body.registryMatch, false);
    assert.equal(body.ok, false);
  });

  it("vault con el DID sin corregir: ok falso", async () => {
    globalThis.fetch = createFakeFetch({
      ...actaRoutes(),
      [`GET /contracts/vault/${INSTITUTION_PUBLIC_KEY}`]: () =>
        jsonReply(200, { owner: INSTITUTION_PUBLIC_KEY, vault_address: VAULT_ADDRESS, did_uri: INSTITUTION_PUBLIC_KEY }),
    });
    const body = await (await get(health, "/api/health")).json();
    assert.equal(body.vaultDidOk, false);
    assert.equal(body.ok, false);
  });

  it("sin configuración: lista las variables que faltan, sin valores", async () => {
    useEnv({ ACTA_API_KEY: "secreto-de-prueba" });
    const text = await (await get(health, "/api/health")).text();
    const body = JSON.parse(text);
    assert.equal(body.ok, false);
    assert.equal(body.configured, false);
    assert.ok(body.problems.some((p) => p.startsWith("ACTA_API_BASE")));
    assert.equal(text.includes("secreto-de-prueba"), false);
  });

});

describe("fallas inesperadas", () => {
  it("responden 500 con un id de petición y nada más (sin trazas)", async () => {
    const broken = { method: "GET", get url() { throw new Error("detalle interno"); } };
    const response = await verify.fetch(broken);
    assert.equal(response.status, 500);
    const text = await response.text();
    assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ["error", "requestId"]);
    assert.equal(text.includes("detalle interno"), false);
    assert.equal(logged.join("\n").includes("detalle interno"), false);
  });
});
