import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loginWithWallet, runSigning } from "../../src/services/signingFlow.js";
import { ESTADO, initialSigningState, signingReducer } from "../../src/services/signingMachine.js";
import { ApiError } from "../../src/services/panelApi.js";
import { WalletError } from "../../src/services/freighter.js";

const HUELLA = "a".repeat(64);
const ADDRESS = "GAXUEDUKCI7V5MSQIHWT2DSUNUR73NRK6O2H7A7F4P2XD3QFKQUGQEQS";

// Arma un entorno de prueba: registra el orden de las llamadas y el estado final de la máquina.
function setup({ api = {}, wallet = {} } = {}) {
  const log = [];
  const received = {};
  let state = initialSigningState;
  const track = (name, value) => async (...args) => {
    log.push(name);
    received[name] = args[0];
    const result = typeof value === "function" ? value(...args) : value;
    if (result instanceof Error) throw result;
    return result;
  };
  const fakeApi = {
    prepareIssue: track("prepareIssue", { xdr: "XDR", networkPassphrase: "p", expiresAt: "2026-10-18T10:01:00.000Z", ticket: "TICKET-I" }),
    submitIssue: track("submitIssue", { txId: "tx1", confirmed: true }),
    prepareRevoke: track("prepareRevoke", { xdr: "XDR", expiresAt: null, ticket: "TICKET-R" }),
    submitRevoke: track("submitRevoke", { txId: "tx2", confirmed: true }),
    checkStatus: track("checkStatus", { confirmed: true }),
    ...Object.fromEntries(Object.entries(api).map(([key, value]) => [key, track(key, value)])),
  };
  const fakeWallet = {
    connect: track("connect", { address: ADDRESS }),
    signTransaction: track("signTransaction", "SIGNED_XDR"),
    ...Object.fromEntries(Object.entries(wallet).map(([key, value]) => [key, track(key, value)])),
  };
  const history = [];
  const dispatch = (action) => {
    state = signingReducer(state, action);
    history.push(state.status);
  };
  const run = (kind, extra = {}) =>
    runSigning({
      kind,
      input: { huella: HUELLA, course: "Curso", issueDate: "2026-10-16" },
      address: ADDRESS,
      dispatch,
      api: fakeApi,
      wallet: fakeWallet,
      sleep: async () => {},
      pollAttempts: 3,
      ...extra,
    });
  return { run, log, received, history, get state() { return state; } };
}

describe("flujo de firma", () => {
  it("emitir: wallet → preparar → firmar → enviar, pasando por todos los estados", async () => {
    const t = setup();
    const result = await t.run("issue");
    assert.deepEqual(result, { txId: "tx1" });
    assert.deepEqual(t.log, ["connect", "prepareIssue", "signTransaction", "submitIssue"]);
    assert.deepEqual(t.received.submitIssue, { huella: HUELLA, signedXdr: "SIGNED_XDR", ticket: "TICKET-I" }, "el ticket de la preparación viaja al envío");
    assert.deepEqual(t.history, [ESTADO.SIMULANDO, ESTADO.ESPERANDO_FIRMA, ESTADO.ENVIANDO, ESTADO.CONFIRMADO]);
    assert.deepEqual(t.state.result, { txId: "tx1" });
  });

  it("revocar usa las rutas de revocar y espera 'revoked'", async () => {
    let expected;
    const t = setup({ api: { submitRevoke: { txId: "tx2", confirmed: false }, checkStatus: ({ expect }) => { expected = expect; return { confirmed: true }; } } });
    const result = await t.run("revoke");
    assert.deepEqual(result, { txId: "tx2" });
    assert.deepEqual(t.log, ["connect", "prepareRevoke", "signTransaction", "submitRevoke", "checkStatus"]);
    assert.equal(expected, "revoked");
  });

  it("si la red tarda, sigue consultando hasta confirmar", async () => {
    let calls = 0;
    const t = setup({ api: { submitIssue: { txId: "tx1", confirmed: false }, checkStatus: () => ({ confirmed: ++calls >= 2 }) } });
    assert.deepEqual(await t.run("issue"), { txId: "tx1" });
    assert.equal(calls, 2);
  });

  it("sin confirmación a tiempo: error 'unconfirmed' con el hash, sin reintento", async () => {
    const t = setup({ api: { submitIssue: { txId: "tx1", confirmed: false }, checkStatus: { confirmed: false } } });
    assert.equal(await t.run("issue"), null);
    assert.equal(t.state.status, ESTADO.ERROR);
    assert.equal(t.state.error.kind, "unconfirmed");
    assert.equal(t.state.error.txId, "tx1");
    assert.equal(t.state.error.retryable, false);
  });

  it("Freighter ausente, en otra red o con otra cuenta: error ANTES de preparar nada", async () => {
    for (const [codigo, kind] of [["not-installed", "no_wallet"], ["wrong-network", "wrong_network"], ["wrong-wallet", "wrong_wallet"]]) {
      const t = setup({ wallet: { connect: new WalletError(codigo) } });
      assert.equal(await t.run("issue"), null);
      assert.equal(t.state.error.kind, kind);
      assert.deepEqual(t.log, ["connect"], "no se prepara ni se envía nada");
    }
  });

  it("firma cancelada: 'rejected' y no se envía nada", async () => {
    const t = setup({ wallet: { signTransaction: new WalletError("rejected") } });
    assert.equal(await t.run("issue"), null);
    assert.equal(t.state.error.kind, "rejected");
    assert.equal(t.log.includes("submitIssue"), false);
  });

  it("errores de la API: duplicada (no reintentable) y expirada (reintentable)", async () => {
    const duplicate = setup({ api: { prepareIssue: new ApiError(409, "duplicada") } });
    await duplicate.run("issue");
    assert.equal(duplicate.state.error.kind, "duplicate");
    assert.equal(duplicate.state.error.retryable, false);

    const expired = setup({ api: { submitIssue: new ApiError(400, "expirada", { retryable: true }) } });
    await expired.run("issue");
    assert.equal(expired.state.error.kind, "expired");
    assert.equal(expired.state.error.retryable, true);
  });

  it("reintentar vuelve a preparar y firmar de nuevo (no reutiliza el XDR anterior)", async () => {
    let attempt = 0;
    const t = setup({ api: { prepareIssue: () => ({ xdr: `XDR${++attempt}`, expiresAt: null }), submitIssue: () => (attempt === 1 ? new ApiError(400, "expirada", { retryable: true }) : { txId: "tx9", confirmed: true }) } });
    assert.equal(await t.run("issue"), null);
    assert.equal(t.state.status, ESTADO.ERROR);

    assert.deepEqual(await t.run("issue"), { txId: "tx9" });
    assert.equal(t.log.filter((name) => name === "prepareIssue").length, 2);
    assert.equal(t.log.filter((name) => name === "signTransaction").length, 2);
  });

  it("firma la transacción recién preparada, con la dirección de la sesión", async () => {
    let signed;
    const t = setup({ wallet: { signTransaction: (xdr, address) => { signed = { xdr, address }; return "FIRMADO"; } } });
    await t.run("issue");
    assert.deepEqual(signed, { xdr: "XDR", address: ADDRESS });
  });
});

describe("entrar con la wallet", () => {
  it("reto → conectar → firmar el mensaje → verificar", async () => {
    const calls = [];
    const api = {
      getChallenge: async () => ({ nonce: "n", expiresAt: "e", tag: "t", message: "mensaje", publicKey: ADDRESS }),
      verifyChallenge: async (body) => {
        calls.push(["verify", body]);
        return { authenticated: true };
      },
    };
    const wallet = {
      connect: async (address) => calls.push(["connect", address]),
      signMessage: async (message, address) => {
        calls.push(["sign", message, address]);
        return "FIRMA_BASE64";
      },
    };
    const session = await loginWithWallet({ api, wallet });
    assert.deepEqual(session, { authenticated: true });
    assert.deepEqual(calls, [
      ["connect", ADDRESS],
      ["sign", "mensaje", ADDRESS],
      ["verify", { nonce: "n", expiresAt: "e", tag: "t", signature: "FIRMA_BASE64" }],
    ]);
  });

  it("si la wallet falla, no se llega a verificar", async () => {
    let verified = false;
    const api = {
      getChallenge: async () => ({ publicKey: ADDRESS, message: "m" }),
      verifyChallenge: async () => {
        verified = true;
      },
    };
    const wallet = { connect: async () => { throw new WalletError("wrong-wallet"); }, signMessage: async () => "x" };
    await assert.rejects(() => loginWithWallet({ api, wallet }), (error) => error.codigo === "wrong-wallet");
    assert.equal(verified, false);
  });
});
