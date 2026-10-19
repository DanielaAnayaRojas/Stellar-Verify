// Conexión con la wallet Freighter (extensión del navegador). Aquí solo se firma: ninguna clave
// pasa por esta aplicación ni por el servidor.
//
// Los fallos llevan un `codigo`:
//   "not-installed" | "wrong-network" | "wrong-wallet" | "rejected" | "failed"

import freighterApi from "@stellar/freighter-api";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

const REJECTED_MESSAGE = /declin|reject|denied|cancel/i;
const USER_REJECTED_CODE = -4;

export class WalletError extends Error {
  constructor(codigo) {
    super(codigo);
    this.name = "WalletError";
    this.codigo = codigo;
  }
}

// Freighter no lanza errores: los devuelve en `error`. [?] El código -4 como "rechazado por la persona"
// se apoya en la documentación de Freighter; por eso también se mira el texto del mensaje.
function failureFrom(error) {
  const message = String(error && error.message ? error.message : "");
  if (error && error.code === USER_REJECTED_CODE) return new WalletError("rejected");
  return REJECTED_MESSAGE.test(message) ? new WalletError("rejected") : new WalletError("failed");
}

function toBase64(value) {
  if (typeof value === "string") return value;
  const bytes = Array.isArray(value && value.data) ? value.data : value;
  if (bytes && typeof bytes.length === "number") {
    let binary = "";
    for (const byte of Uint8Array.from(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  throw new WalletError("failed");
}

export function createWallet(api = freighterApi) {
  // Comprueba que Freighter está, en testnet y con la cuenta esperada. Devuelve la dirección activa.
  async function connect(expectedAddress) {
    let connection;
    try {
      connection = await api.isConnected();
    } catch {
      throw new WalletError("not-installed");
    }
    if (!connection || !connection.isConnected) throw new WalletError("not-installed");

    const access = await api.requestAccess();
    if (access.error) throw failureFrom(access.error);

    const network = await api.getNetwork();
    if (network.error) throw failureFrom(network.error);
    if (network.networkPassphrase !== TESTNET_PASSPHRASE) throw new WalletError("wrong-network");
    if (expectedAddress && access.address !== expectedAddress) throw new WalletError("wrong-wallet");
    return { address: access.address };
  }

  // Firma un texto (SEP-53). Devuelve la firma en base64.
  async function signMessage(message, address) {
    const signed = await api.signMessage(message, { address, networkPassphrase: TESTNET_PASSPHRASE });
    if (signed.error) throw failureFrom(signed.error);
    if (address && signed.signerAddress !== address) throw new WalletError("wrong-wallet");
    return toBase64(signed.signedMessage);
  }

  // Firma una transacción preparada por el servidor. Devuelve el XDR firmado.
  async function signTransaction(xdr, address) {
    const signed = await api.signTransaction(xdr, { address, networkPassphrase: TESTNET_PASSPHRASE });
    if (signed.error) throw failureFrom(signed.error);
    if (address && signed.signerAddress !== address) throw new WalletError("wrong-wallet");
    return signed.signedTxXdr;
  }

  return { connect, signMessage, signTransaction };
}

export const wallet = createWallet();
