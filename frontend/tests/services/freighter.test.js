import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TESTNET_PASSPHRASE, WalletError, createWallet } from "../../src/services/freighter.js";

const ADDRESS = "GAXUEDUKCI7V5MSQIHWT2DSUNUR73NRK6O2H7A7F4P2XD3QFKQUGQEQS";
const OTHER = "GBBO6CQOPNSVSFAUVHJDRBGZVQLBXKWZQVZEFRC26HPE6K7B44EJRKRB";

// Freighter falso: devuelve lo configurado y anota con qué se le llamó.
function fakeApi(overrides = {}) {
  const calls = [];
  const api = {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: ADDRESS }),
    getNetwork: async () => ({ network: "TESTNET", networkPassphrase: TESTNET_PASSPHRASE }),
    signMessage: async (...args) => {
      calls.push(["signMessage", ...args]);
      return { signedMessage: "firma-en-base64", signerAddress: ADDRESS };
    },
    signTransaction: async (...args) => {
      calls.push(["signTransaction", ...args]);
      return { signedTxXdr: "XDR_FIRMADO", signerAddress: ADDRESS };
    },
    ...overrides,
  };
  return { wallet: createWallet(api), calls };
}

const codeOf = async (promise) => {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof WalletError);
    return error.codigo;
  }
  return "sin error";
};

describe("wallet Freighter", () => {
  it("conecta cuando está instalada, en testnet y con la cuenta esperada", async () => {
    const { wallet } = fakeApi();
    assert.deepEqual(await wallet.connect(ADDRESS), { address: ADDRESS });
  });

  it("Freighter ausente: isConnected falso o que falla", async () => {
    assert.equal(await codeOf(fakeApi({ isConnected: async () => ({ isConnected: false }) }).wallet.connect(ADDRESS)), "not-installed");
    assert.equal(await codeOf(fakeApi({ isConnected: async () => { throw new Error("sin extensión"); } }).wallet.connect(ADDRESS)), "not-installed");
  });

  it("otra red: no es testnet", async () => {
    const api = fakeApi({ getNetwork: async () => ({ network: "PUBLIC", networkPassphrase: "Public Global Stellar Network ; September 2015" }) });
    assert.equal(await codeOf(api.wallet.connect(ADDRESS)), "wrong-network");
  });

  it("otra cuenta distinta de la de la institución", async () => {
    const api = fakeApi({ requestAccess: async () => ({ address: OTHER }) });
    assert.equal(await codeOf(api.wallet.connect(ADDRESS)), "wrong-wallet");
  });

  it("la persona rechaza el acceso: 'rejected'; otro error de Freighter: 'failed'", async () => {
    const byCode = fakeApi({ requestAccess: async () => ({ error: { code: -4, message: "x" } }) });
    assert.equal(await codeOf(byCode.wallet.connect(ADDRESS)), "rejected");
    const byText = fakeApi({ requestAccess: async () => ({ error: { code: 1, message: "The user declined access to this domain" } }) });
    assert.equal(await codeOf(byText.wallet.connect(ADDRESS)), "rejected");
    const other = fakeApi({ requestAccess: async () => ({ error: { code: -1, message: "Internal error" } }) });
    assert.equal(await codeOf(other.wallet.connect(ADDRESS)), "failed");
  });

  it("signMessage firma con la cuenta y la red de pruebas, y devuelve base64", async () => {
    const { wallet, calls } = fakeApi();
    assert.equal(await wallet.signMessage("mensaje", ADDRESS), "firma-en-base64");
    assert.deepEqual(calls[0], ["signMessage", "mensaje", { address: ADDRESS, networkPassphrase: TESTNET_PASSPHRASE }]);
  });

  it("signMessage convierte las firmas que no son texto (extensión antigua) a base64", async () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, index) => index);
    const expected = Buffer.from(bytes).toString("base64");
    for (const signedMessage of [bytes, { type: "Buffer", data: Array.from(bytes) }, Array.from(bytes)]) {
      const { wallet } = fakeApi({ signMessage: async () => ({ signedMessage, signerAddress: ADDRESS }) });
      assert.equal(await wallet.signMessage("m", ADDRESS), expected);
    }
  });

  it("firmar con otra cuenta, o cancelar, es un fallo claro", async () => {
    const other = fakeApi({ signMessage: async () => ({ signedMessage: "x", signerAddress: OTHER }) });
    assert.equal(await codeOf(other.wallet.signMessage("m", ADDRESS)), "wrong-wallet");
    const cancelled = fakeApi({ signTransaction: async () => ({ error: { message: "User rejected the request" } }) });
    assert.equal(await codeOf(cancelled.wallet.signTransaction("XDR", ADDRESS)), "rejected");
  });

  it("signTransaction entrega el XDR firmado, indicando cuenta y red", async () => {
    const { wallet, calls } = fakeApi();
    assert.equal(await wallet.signTransaction("XDR", ADDRESS), "XDR_FIRMADO");
    assert.deepEqual(calls[0], ["signTransaction", "XDR", { address: ADDRESS, networkPassphrase: TESTNET_PASSPHRASE }]);
  });
});
