import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../../api/_lib/config.js";
import { ENV } from "../fixtures.js";

describe("configuración del servidor", () => {
  it("acepta un entorno completo", () => {
    const result = loadConfig({ ...ENV });
    assert.equal(result.ok, true);
    assert.equal(result.config.actaApiBase, "https://sandbox-api.acta.build");
    assert.equal(result.config.signatureLayer, "off");
  });

  it("SIGNATURE_LAYER vacío cuenta como off", () => {
    assert.equal(loadConfig({ ...ENV, SIGNATURE_LAYER: "" }).config.signatureLayer, "off");
  });

  it("quita la barra final de las direcciones", () => {
    const result = loadConfig({ ...ENV, ACTA_API_BASE: "https://sandbox-api.acta.build/" });
    assert.equal(result.config.actaApiBase, "https://sandbox-api.acta.build");
  });

  it("nombra las variables que faltan y nunca imprime valores", () => {
    const result = loadConfig({ ACTA_API_KEY: "valor-que-no-debe-aparecer" });
    assert.equal(result.ok, false);
    const text = result.problems.join("\n");
    assert.match(text, /ACTA_API_BASE/);
    assert.match(text, /DID_RESOLVER_BASE/);
    assert.match(text, /INSTITUTION_PUBLIC_KEY/);
    assert.match(text, /INSTITUTION_DID/);
    assert.doesNotMatch(text, /valor-que-no-debe-aparecer/);
  });

  it("rechaza direcciones que no son https, claves y DIDs inválidos", () => {
    assert.equal(loadConfig({ ...ENV, ACTA_API_BASE: "http://sandbox-api.acta.build" }).ok, false);
    assert.equal(loadConfig({ ...ENV, DID_RESOLVER_BASE: "no es una dirección" }).ok, false);
    assert.equal(loadConfig({ ...ENV, INSTITUTION_PUBLIC_KEY: "GABC" }).ok, false);
    assert.equal(loadConfig({ ...ENV, INSTITUTION_DID: "did:stellar:mainnet:abc" }).ok, false);
    assert.equal(loadConfig({ ...ENV, INSTITUTION_NAME: "x".repeat(121) }).ok, false);
  });

  it("STELLAR_RPC_URL: por defecto el RPC público de testnet; http solo hacia esta máquina", () => {
    assert.equal(loadConfig({ ...ENV }).config.stellarRpcUrl, "https://soroban-testnet.stellar.org");
    assert.equal(loadConfig({ ...ENV, STELLAR_RPC_URL: "https://rpc.ejemplo.org/" }).config.stellarRpcUrl, "https://rpc.ejemplo.org");
    assert.equal(loadConfig({ ...ENV, STELLAR_RPC_URL: "http://127.0.0.1:8899/rpc" }).config.stellarRpcUrl, "http://127.0.0.1:8899/rpc");
    assert.equal(loadConfig({ ...ENV, STELLAR_RPC_URL: "http://localhost:8000" }).ok, true);
    assert.equal(loadConfig({ ...ENV, STELLAR_RPC_URL: "http://rpc.ejemplo.org" }).ok, false);
    assert.equal(loadConfig({ ...ENV, STELLAR_RPC_URL: "ftp://localhost" }).ok, false);
    // Las otras direcciones siguen exigiendo https, también hacia esta máquina.
    assert.equal(loadConfig({ ...ENV, ACTA_API_BASE: "http://localhost:3000" }).ok, false);
  });

  it("SESSION_SECRET: ok, ausente o demasiado corto (solo afecta al panel, no invalida la configuración)", () => {
    assert.equal(loadConfig({ ...ENV }).config.session, "ok");
    const { SESSION_SECRET, ...withoutSecret } = ENV;
    const missing = loadConfig(withoutSecret);
    assert.equal(missing.ok, true);
    assert.equal(missing.config.session, "missing");
    assert.equal(missing.config.sessionSecret, null);
    const short = loadConfig({ ...ENV, SESSION_SECRET: "corto" });
    assert.equal(short.config.session, "too_short");
    assert.equal(short.config.sessionSecret, null);
  });

  it("SIGNATURE_LAYER acepta solo 'on' y 'off' (sin importar mayúsculas)", () => {
    assert.equal(loadConfig({ ...ENV, SIGNATURE_LAYER: "on" }).config.signatureLayer, "on");
    assert.equal(loadConfig({ ...ENV, SIGNATURE_LAYER: "ON" }).config.signatureLayer, "on");
    const bad = loadConfig({ ...ENV, SIGNATURE_LAYER: "quizas" });
    assert.equal(bad.ok, false);
    assert.match(bad.problems.join("\n"), /SIGNATURE_LAYER/);
  });
});
