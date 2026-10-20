import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Networks } from "@stellar/stellar-sdk";
import { createActaProvider } from "../../api/_lib/provider/acta.js";
import {
  CONFIG,
  HUELLA_VALID,
  INSTITUTION_DID,
  INSTITUTION_PUBLIC_KEY,
  REGISTRY_ID,
  createFakeFetch,
  jsonReply,
} from "../fixtures.js";
import { buildInvokeXdr, createFakeRpc, issueArgs, randomKeypair, resultCode } from "../txFixtures.js";

const configOk = () => jsonReply(200, { networkType: "testnet", didStellarRegistryId: REGISTRY_ID });

function providerWith(routes = {}, { rpc, ...options } = {}) {
  const fetchImpl = createFakeFetch({ "GET /config": configOk, ...routes });
  const provider = createActaProvider(CONFIG, {
    fetchImpl,
    rpcFactory: () => rpc,
    sleep: async () => {},
    pollAttempts: 3,
    ...options,
  });
  return { provider, fetchImpl };
}

describe("proveedor ACTA: preparar escrituras", () => {
  it("prepareIssue: el servidor fija owner, issuer, issuerDid y sourcePublicKey", async () => {
    const { provider, fetchImpl } = providerWith({
      "POST /contracts/vc/issue": () => jsonReply(200, { xdr: "AAAA", network: Networks.TESTNET }),
    });
    const prepared = await provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: '{"a":1}' });
    assert.equal(prepared.xdr, "AAAA");
    assert.equal(prepared.networkPassphrase, Networks.TESTNET);

    const call = fetchImpl.calls.find((c) => c.key === "POST /contracts/vc/issue");
    assert.equal(call.headers["x-acta-key"], CONFIG.actaApiKey);
    assert.deepEqual(JSON.parse(call.body), {
      owner: INSTITUTION_PUBLIC_KEY,
      vcId: HUELLA_VALID,
      vcData: '{"a":1}',
      issuer: INSTITUTION_PUBLIC_KEY,
      issuerDid: INSTITUTION_DID,
      sourcePublicKey: INSTITUTION_PUBLIC_KEY,
    });
    // El mismo cuerpo vuelve en `request`: la API de ACTA lo pide otra vez al enviar la transacción firmada.
    assert.deepEqual(prepared.request, JSON.parse(call.body));
  });

  it("acepta que ACTA diga la red con su nombre corto, y siempre entrega la frase de testnet", async () => {
    const { provider } = providerWith({ "POST /contracts/vc/issue": () => jsonReply(200, { xdr: "AAAA", network: "testnet" }) });
    const prepared = await provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" });
    assert.equal(prepared.networkPassphrase, Networks.TESTNET);
  });

  it("una preparación lenta (más que una lectura) no se corta, pero una lectura lenta sí", async () => {
    const fetchImpl = createFakeFetch({
      "GET /config": configOk,
      "POST /contracts/vc/issue": () => jsonReply(200, { xdr: "AAAA", network: Networks.TESTNET }),
    });
    // Tarda 80 ms en las rutas indicadas; si el tiempo de espera ya venció, se corta como lo haría fetch.
    const slowOn = (paths) => async (url, init) => {
      if (paths.includes(new URL(url).pathname)) await new Promise((resolve) => setTimeout(resolve, 80));
      init.signal.throwIfAborted();
      return fetchImpl(url, init);
    };

    const slowPrepare = createActaProvider(CONFIG, { fetchImpl: slowOn(["/contracts/vc/issue"]), timeoutMs: 20, prepareTimeoutMs: 500 });
    assert.equal((await slowPrepare.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" })).xdr, "AAAA");

    const slowRead = createActaProvider(CONFIG, { fetchImpl: slowOn(["/config"]), timeoutMs: 20, writeTimeoutMs: 500 });
    await assert.rejects(() => slowRead.getNetworkInfo(), (error) => error.kind === "unavailable" && error.operation === "config");
  });

  it("prepareRevoke envía la fecha completa y la huella", async () => {
    const { provider, fetchImpl } = providerWith({
      "POST /contracts/vc/revoke": () => jsonReply(200, { xdr: "BBBB", network: Networks.TESTNET }),
    });
    await provider.prepareRevoke({ huella: HUELLA_VALID, dateIso: "2026-10-18T10:00:00.000Z" });
    const call = fetchImpl.calls.find((c) => c.key === "POST /contracts/vc/revoke");
    assert.deepEqual(JSON.parse(call.body), {
      owner: INSTITUTION_PUBLIC_KEY,
      vcId: HUELLA_VALID,
      date: "2026-10-18T10:00:00.000Z",
      sourcePublicKey: INSTITUTION_PUBLIC_KEY,
    });
  });

  it("vc_already_exists llega como código (409 al preparar: no hay nada que firmar)", async () => {
    const { provider } = providerWith({
      "POST /contracts/vc/issue": () => jsonReply(409, { error: "vc_already_exists", message: "texto largo" }),
    });
    await assert.rejects(
      () => provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" }),
      (error) => error.kind === "bad_request" && error.code === "vc_already_exists",
    );
  });

  it("rechaza una red que no es testnet o una respuesta sin XDR", async () => {
    const mainnet = providerWith({ "POST /contracts/vc/issue": () => jsonReply(200, { xdr: "AAAA", network: "Public Global Stellar Network ; September 2015" }) });
    await assert.rejects(() => mainnet.provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" }), (e) => e.kind === "wrong_network");

    const empty = providerWith({ "POST /contracts/vc/issue": () => jsonReply(200, { network: Networks.TESTNET }) });
    await assert.rejects(() => empty.provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" }), (e) => e.kind === "invalid_response");
  });

  it("solo testnet: si ACTA dice otra red, no prepara nada", async () => {
    const fetchImpl = createFakeFetch({
      "GET /config": () => jsonReply(200, { networkType: "mainnet" }),
      "POST /contracts/vc/issue": () => jsonReply(200, { xdr: "AAAA", network: Networks.TESTNET }),
    });
    const provider = createActaProvider(CONFIG, { fetchImpl });
    await assert.rejects(() => provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" }), (e) => e.kind === "wrong_network");
    assert.equal(fetchImpl.calls.some((c) => c.key === "POST /contracts/vc/issue"), false);
  });
});

describe("proveedor ACTA: enviar la transacción firmada", () => {
  const keypair = randomKeypair();
  const signedXdr = buildInvokeXdr({
    source: keypair.publicKey(),
    sign: keypair,
    functionName: "issue",
    args: issueArgs({ source: keypair.publicKey(), huella: HUELLA_VALID }),
  });
  const request = {
    owner: INSTITUTION_PUBLIC_KEY,
    vcId: HUELLA_VALID,
    vcData: "{}",
    issuer: INSTITUTION_PUBLIC_KEY,
    issuerDid: INSTITUTION_DID,
    sourcePublicKey: INSTITUTION_PUBLIC_KEY,
  };
  const sha256 = (text) => createHash("sha256").update(text).digest("hex");
  const TX = "c".repeat(64);

  // `statuses`: lo que va diciendo verify-vc en cada consulta (el último se repite).
  function setup({ api, statuses = ["invalid"], rpc = createFakeRpc() } = {}) {
    let reads = 0;
    const { provider, fetchImpl } = providerWith(
      {
        "POST /contracts/vc/issue": api ?? (() => jsonReply(201, { tx_id: TX })),
        "POST /contracts/vc/revoke": api ?? (() => jsonReply(201, { tx_id: TX })),
        "POST /contracts/vault/verify-vc": () => jsonReply(200, { status: statuses[Math.min(reads++, statuses.length - 1)] }),
      },
      { rpc },
    );
    return { provider, fetchImpl, rpc };
  }
  const send = (provider, extra = {}) =>
    provider.submit({ operation: "issue", huella: HUELLA_VALID, request, signedXdr, ...extra });

  it("camino principal: la API de ACTA, con el mismo cuerpo, signedXdr y una Idempotency-Key", async () => {
    const { provider, fetchImpl, rpc } = setup();
    assert.deepEqual(await send(provider), { txId: TX, via: "api" });

    const call = fetchImpl.calls.find((c) => c.key === "POST /contracts/vc/issue");
    assert.deepEqual(JSON.parse(call.body), { ...request, signedXdr });
    assert.equal(call.headers["x-acta-key"], CONFIG.actaApiKey);
    assert.equal(call.headers["idempotency-key"], sha256(signedXdr), "el mismo XDR firmado siempre da la misma clave");
    assert.equal(rpc.sent.length, 0, "no se usa el respaldo");
  });

  it("revocar usa la ruta de revocar", async () => {
    const { provider, fetchImpl } = setup();
    await send(provider, { operation: "revoke", request: { owner: INSTITUTION_PUBLIC_KEY, vcId: HUELLA_VALID, date: "2026-10-18T10:00:00.000Z", sourcePublicKey: INSTITUTION_PUBLIC_KEY } });
    assert.ok(fetchImpl.calls.some((c) => c.key === "POST /contracts/vc/revoke"));
    assert.equal(fetchImpl.calls.some((c) => c.key === "POST /contracts/vc/issue"), false);
  });

  it("si la respuesta no trae tx_id, el hash queda en null (no se inventa)", async () => {
    const { provider } = setup({ api: () => jsonReply(201, { ok: true }) });
    assert.deepEqual(await send(provider), { txId: null, via: "api" });
  });

  it("los rechazos claros de ACTA se devuelven tal cual, SIN usar el respaldo", async () => {
    const cases = [
      [400, { error: "signed_xdr_invalid" }, "bad_request"],
      [400, { error: "simulation_error" }, "bad_request"],
      [401, { error: "unauthorized" }, "unauthorized"],
      [403, { error: "insufficient_scope" }, "forbidden"],
      [409, { error: "vc_already_exists" }, "bad_request"],
      [429, { error: "write_rate_limit_exceeded" }, "rate_limited"],
    ];
    for (const [status, body, kind] of cases) {
      const { provider, rpc } = setup({ api: () => jsonReply(status, body) });
      await assert.rejects(() => send(provider), (error) => error.kind === kind && error.operation === "submit-api", `${status} ${body.error}`);
      assert.equal(rpc.sent.length, 0, `${body.error}: no se reenvía`);
    }
  });

  it("el envío firmado nunca espera la pausa de un 429 previo", async () => {
    let reloj = 1_000_000;
    const { provider, fetchImpl } = providerWith(
      {
        "POST /contracts/vault/verify-vc": () => jsonReply(429, { error: "write_rate_limit_exceeded" }),
        "POST /contracts/vc/issue": () => jsonReply(201, { tx_id: TX }),
      },
      { now: () => reloj },
    );
    await assert.rejects(() => provider.getStatus(HUELLA_VALID), (error) => error.kind === "rate_limited");
    reloj += 1_000; // dentro de la pausa
    assert.deepEqual(await send(provider), { txId: TX, via: "api" });
    assert.equal(fetchImpl.calls.filter((c) => c.key === "POST /contracts/vc/issue").length, 1);
  });

  it("si la API falla (500 genérico, red caída o respuesta rara) y la operación NO entró, se envía por la red", async () => {
    const failures = [
      () => jsonReply(500, { error: "tx_submit_error", message: "Internal server error" }),
      () => jsonReply(502, {}),
      () => new Response("<html>", { status: 200 }),
    ];
    for (const api of failures) {
      const rpc = createFakeRpc({ results: [{ status: "NOT_FOUND" }, { status: "SUCCESS" }] });
      const { provider } = setup({ api, rpc });
      const result = await send(provider);
      assert.equal(result.via, "rpc");
      assert.match(result.txId, /^[0-9a-f]{64}$/);
      assert.equal(rpc.sent.length, 1);
    }
  });

  it("si la API cayó pero la operación SÍ entró, no se reenvía nada (se mira verify-vc primero)", async () => {
    const { provider, rpc } = setup({ api: () => jsonReply(500, { error: "tx_submit_error" }), statuses: ["valid"] });
    assert.deepEqual(await send(provider), { txId: null, via: "already-applied" });
    assert.equal(rpc.sent.length, 0);
  });

  it("si ni siquiera se puede leer el estado, igual se intenta el respaldo", async () => {
    const fetchImpl = createFakeFetch({
      "GET /config": configOk,
      "POST /contracts/vc/issue": () => jsonReply(500, { error: "tx_submit_error" }),
      "POST /contracts/vault/verify-vc": () => jsonReply(500, {}),
    });
    const rpc = createFakeRpc();
    const provider = createActaProvider(CONFIG, { fetchImpl, rpcFactory: () => rpc, sleep: async () => {}, pollAttempts: 2 });
    assert.equal((await send(provider)).via, "rpc");
  });

  it("el respaldo traduce los rechazos de la red a tipos propios (caducó, saldo, etc.)", async () => {
    const cases = [
      ["txTooLate", "tx_expired"],
      ["txBadSeq", "tx_bad_sequence"],
      ["txInsufficientBalance", "tx_insufficient_funds"],
      ["txBadAuth", "tx_rejected"],
    ];
    for (const [name, kind] of cases) {
      const rpc = createFakeRpc({ send: { status: "ERROR", hash: "x", errorResult: resultCode(name) } });
      const { provider } = setup({ api: () => jsonReply(500, {}), rpc });
      await assert.rejects(() => send(provider), (error) => error.kind === kind && error.code === name, name);
    }
  });

  it("el respaldo: transacción que falla, red saturada o caída", async () => {
    const failed = setup({ api: () => jsonReply(500, {}), rpc: createFakeRpc({ results: [{ status: "FAILED", resultXdr: resultCode("txFailed") }] }) });
    await assert.rejects(() => send(failed.provider), (e) => e.kind === "tx_failed" && e.code === "txFailed");

    const busy = setup({ api: () => jsonReply(500, {}), rpc: createFakeRpc({ send: { status: "TRY_AGAIN_LATER", hash: "x" } }) });
    await assert.rejects(() => send(busy.provider), (e) => e.kind === "unavailable");

    const down = setup({ api: () => jsonReply(500, {}), rpc: createFakeRpc({ send: new Error("ECONNRESET") }) });
    await assert.rejects(() => send(down.provider), (e) => e.kind === "unavailable");
  });

  it("un XDR ilegible no sale hacia la red aunque la API haya fallado", async () => {
    const { provider, rpc } = setup({ api: () => jsonReply(500, {}) });
    await assert.rejects(() => send(provider, { signedXdr: "basura" }), (e) => e.code === "xdr_invalid");
    assert.equal(rpc.sent.length, 0);
  });

  it("solo testnet: con otra red no se envía nada", async () => {
    const rpc = createFakeRpc();
    const fetchImpl = createFakeFetch({ "GET /config": () => jsonReply(200, { networkType: "mainnet" }) });
    const provider = createActaProvider(CONFIG, { fetchImpl, rpcFactory: () => rpc, sleep: async () => {} });
    await assert.rejects(() => send(provider), (e) => e.kind === "wrong_network");
    assert.equal(rpc.sent.length, 0);
    assert.equal(fetchImpl.calls.some((c) => c.key === "POST /contracts/vc/issue"), false);
  });
});

describe("proveedor ACTA: esperar la confirmación", () => {
  function waiting(statuses, { attempts = 3 } = {}) {
    let reads = 0;
    const naps = [];
    const fetchImpl = createFakeFetch({
      "GET /config": configOk,
      "POST /contracts/vault/verify-vc": () => {
        const answer = statuses[Math.min(reads++, statuses.length - 1)];
        return answer instanceof Error ? jsonReply(500, {}) : jsonReply(200, { status: answer });
      },
    });
    const provider = createActaProvider(CONFIG, { fetchImpl, sleep: async (ms) => naps.push(ms), pollAttempts: attempts, pollIntervalMs: 500 });
    return { provider, naps, get reads() { return reads; } };
  }

  it("true en cuanto verify-vc muestra el estado esperado", async () => {
    const t = waiting(["invalid", "invalid", "valid"]);
    assert.equal(await t.provider.waitForStatus(HUELLA_VALID, "valid"), true);
    assert.equal(t.reads, 3);
  });

  it("false si no aparece dentro de los intentos, sin esperar de más al final", async () => {
    const t = waiting(["invalid"]);
    assert.equal(await t.provider.waitForStatus(HUELLA_VALID, "valid"), false);
    assert.equal(t.reads, 3);
    assert.deepEqual(t.naps, [500, 500], "no duerme después del último intento");
  });

  it("un fallo de lectura no es una respuesta: sigue esperando", async () => {
    const t = waiting([new Error("x"), "revoked"]);
    assert.equal(await t.provider.waitForStatus(HUELLA_VALID, "revoked"), true);
  });
});

describe("proveedor ACTA: causa de los fallos de red (solo para el registro)", () => {
  async function failureWith(thrown) {
    const { provider } = providerWith({
      "POST /contracts/vc/issue": () => {
        throw thrown;
      },
    });
    return provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" }).catch((error) => error);
  }

  it("distingue tiempo agotado, error de red con código y error sin código", async () => {
    const timeout = await failureWith(Object.assign(new Error("x"), { name: "TimeoutError" }));
    assert.equal(timeout.kind, "unavailable");
    assert.equal(timeout.code, "timeout");
    assert.equal(timeout.operation, "prepare-issue");
    assert.equal(typeof timeout.elapsedMs, "number", "el registro dice cuánto tardó en fallar");

    const dns = await failureWith(Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }));
    assert.equal(dns.code, "ENOTFOUND");

    const other = await failureWith(new TypeError("fetch failed con texto interno"));
    assert.equal(other.code, "network");
    assert.equal(JSON.stringify(other).includes("texto interno"), false, "el mensaje crudo no se guarda");
  });
});

describe("proveedor ACTA: una petición colgada se reintenta una vez", () => {
  const hang = () => {
    throw Object.assign(new Error("x"), { name: "TimeoutError" });
  };

  function withFetch(behaviors) {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(String(url));
      return behaviors[Math.min(calls.length - 1, behaviors.length - 1)](url, init);
    };
    return { calls, provider: createActaProvider(CONFIG, { fetchImpl, sleep: async () => {} }) };
  }

  it("si la primera se cuelga y la segunda responde, la lectura sale bien", async () => {
    const { provider, calls } = withFetch([hang, configOk]);
    assert.equal((await provider.getNetworkInfo()).networkType, "testnet");
    assert.equal(calls.length, 2);
  });

  it("si las dos se cuelgan, falla como 'unavailable' tras 2 intentos", async () => {
    const { provider, calls } = withFetch([hang]);
    await assert.rejects(() => provider.getNetworkInfo(), (error) => error.kind === "unavailable" && error.code === "timeout");
    assert.equal(calls.length, 2);
  });

  it("una respuesta de ACTA, aunque sea un error, NO se repite", async () => {
    const { provider, calls } = withFetch([() => jsonReply(500, { error: "tx_submit_error" })]);
    await assert.rejects(() => provider.getNetworkInfo(), (error) => error.status === 500);
    assert.equal(calls.length, 1);
  });

  it("preparar también se reintenta, y enviar por la API no (el respaldo decide)", async () => {
    const prepare = withFetch([configOk, hang, () => jsonReply(200, { xdr: "AAAA", network: Networks.TESTNET })]);
    assert.equal((await prepare.provider.prepareIssue({ huella: HUELLA_VALID, vcDataText: "{}" })).xdr, "AAAA");
    assert.equal(prepare.calls.filter((url) => url.includes("/contracts/vc/issue")).length, 2);

    // Enviar por la API: un solo intento; si se cuelga, decide el respaldo (se mira el estado y se usa la red).
    const rpc = createFakeRpc({ send: () => ({ status: "PENDING", hash: "h".repeat(64) }) });
    const signed = buildInvokeXdr({ source: INSTITUTION_PUBLIC_KEY, sign: randomKeypair(), functionName: "issue", args: issueArgs({ source: INSTITUTION_PUBLIC_KEY, huella: HUELLA_VALID }) });
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(String(url));
      if (String(url).includes("/contracts/vc/issue")) return hang();
      if (String(url).endsWith("/config")) return configOk();
      return jsonReply(200, { status: "invalid" });
    };
    const provider = createActaProvider(CONFIG, { fetchImpl, rpcFactory: () => rpc, sleep: async () => {} });
    const result = await provider.submit({ operation: "issue", huella: HUELLA_VALID, request: { vcId: HUELLA_VALID }, signedXdr: signed });
    assert.equal(result.via, "rpc");
    assert.equal(urls.filter((url) => url.includes("/contracts/vc/issue")).length, 1, "un solo intento a la API de envío");
  });
});

describe("proveedor ACTA: dirección del vault en caché", () => {
  it("getVaultAddress lee una vez y reutiliza el valor; un fallo no se guarda", async () => {
    let reads = 0;
    let failNext = true;
    const fetchImpl = createFakeFetch({
      "GET /config": configOk,
      [`GET /contracts/vault/${INSTITUTION_PUBLIC_KEY}`]: () => {
        reads += 1;
        if (failNext) {
          failNext = false;
          return jsonReply(500, { error: "tx_submit_error" });
        }
        return jsonReply(200, { owner: INSTITUTION_PUBLIC_KEY, vault_address: "C" + "A".repeat(55), did_uri: INSTITUTION_DID, version: 1, vc_count: 0 });
      },
    });
    const provider = createActaProvider(CONFIG, { fetchImpl, sleep: async () => {} });

    await assert.rejects(() => provider.getVaultAddress());
    assert.equal(await provider.getVaultAddress(), "C" + "A".repeat(55));
    assert.equal(await provider.getVaultAddress(), "C" + "A".repeat(55));
    assert.equal(reads, 2, "el fallo no se guardó y el éxito se reutilizó");
  });
});

describe("proveedor ACTA: dirección del vault fijada en la configuración", () => {
  it("si INSTITUTION_VAULT_ADDRESS está, getVaultAddress no llama a ACTA ni siquiera si ACTA no responde", async () => {
    const pinned = "CABXSPQQ32TS74EM52DGAQLXCWZWYPRECUJ5C2BN3G6GWTH4PU3TPI7W";
    let calls = 0;
    const provider = createActaProvider(
      { ...CONFIG, institutionVaultAddress: pinned },
      { fetchImpl: async () => { calls += 1; throw new Error("ACTA caído"); }, sleep: async () => {} },
    );
    assert.equal(await provider.getVaultAddress(), pinned);
    assert.equal(calls, 0);
  });
});
