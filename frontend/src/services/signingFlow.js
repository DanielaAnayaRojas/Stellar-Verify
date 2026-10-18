// Orquesta emitir o revocar: comprobar la wallet → preparar → firmar → enviar → esperar la confirmación.
// Es lógica pura (sin pantallas): la interfaz solo recibe `dispatch` y muestra el estado.

import { TxError, mapError } from "./txError.js";

const DEFAULT_POLL_ATTEMPTS = 10;
const DEFAULT_POLL_INTERVAL_MS = 2000;

const OPERATIONS = {
  issue: { prepare: "prepareIssue", submit: "submitIssue", expect: "valid" },
  revoke: { prepare: "prepareRevoke", submit: "submitRevoke", expect: "revoked" },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// kind: "issue" | "revoke". input: { huella, course?, issueDate? }. Devuelve { txId } o null si falló
// (el fallo ya se avisó con dispatch FAILED).
export async function runSigning({
  kind,
  input,
  address,
  dispatch,
  api,
  wallet,
  sleep = wait,
  pollAttempts = DEFAULT_POLL_ATTEMPTS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}) {
  const operation = OPERATIONS[kind];
  try {
    dispatch({ type: "START" });

    // Primero la wallet: así el XDR (que vale 60 s) no se prepara hasta que la firma sea posible.
    await wallet.connect(address);

    const prepared = await api[operation.prepare](input);
    dispatch({ type: "PREPARED", expiresAt: prepared.expiresAt });

    // Firmar enseguida: pasados 60 s el servidor rechaza la transacción y hay que volver a preparar.
    const signedXdr = await wallet.signTransaction(prepared.xdr, address);
    dispatch({ type: "SIGNED" });

    // El ticket que entregó el servidor al preparar vuelve tal cual: de él sale el cuerpo que pide ACTA.
    const submitted = await api[operation.submit]({ huella: input.huella, signedXdr, ticket: prepared.ticket });

    let confirmed = submitted.confirmed === true;
    for (let attempt = 0; !confirmed && attempt < pollAttempts; attempt += 1) {
      await sleep(pollIntervalMs);
      ({ confirmed } = await api.checkStatus({ huella: input.huella, expect: operation.expect }));
    }
    // Enviada pero sin confirmar: no se reintenta (duplicaría el envío); se entrega el hash para consultarlo.
    if (!confirmed) throw new TxError({ kind: "unconfirmed", retryable: false, txId: submitted.txId });

    const result = { txId: submitted.txId };
    dispatch({ type: "CONFIRMED", result });
    return result;
  } catch (error) {
    dispatch({ type: "FAILED", error: mapError(error) });
    return null;
  }
}

// Entrar al panel: reto del servidor → firma del mensaje con Freighter → sesión.
// Lanza el error original (WalletError o ApiError); la pantalla lo traduce con mapError.
export async function loginWithWallet({ api, wallet }) {
  const challenge = await api.getChallenge();
  await wallet.connect(challenge.publicKey);
  const signature = await wallet.signMessage(challenge.message, challenge.publicKey);
  return api.verifyChallenge({
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    tag: challenge.tag,
    signature,
  });
}
