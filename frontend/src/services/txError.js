// Un único módulo convierte cualquier fallo (de la wallet, de la API o de la red) en un TxError.
// La pantalla busca el texto en textos.json → firma.errores[messageKey]; aquí no hay frases.

export class TxError extends Error {
  constructor({ kind, retryable = false, requestId = null, txId = null, field = null }) {
    super(kind);
    this.name = "TxError";
    this.kind = kind;
    this.retryable = retryable;
    this.messageKey = kind;
    this.requestId = requestId;
    this.txId = txId;
    this.field = field;
  }
}

// Fallos de Freighter (WalletError.codigo)
const WALLET_KINDS = {
  "not-installed": { kind: "no_wallet", retryable: true },
  "wrong-network": { kind: "wrong_network", retryable: true },
  "wrong-wallet": { kind: "wrong_wallet", retryable: true },
  rejected: { kind: "rejected", retryable: true },
  failed: { kind: "wallet_error", retryable: true },
};

// Fallos de la API (ApiError.codigo)
const API_KINDS = {
  "sin-conexion": { kind: "unavailable", retryable: true },
  no_disponible: { kind: "unavailable", retryable: true },
  limite: { kind: "rate_limited", retryable: true },
  expirada: { kind: "expired", retryable: true },
  duplicada: { kind: "duplicate", retryable: false },
  ya_revocada: { kind: "already_revoked", retryable: false },
  no_existe: { kind: "not_found", retryable: false },
  no_autenticado: { kind: "unauthorized", retryable: false },
  datos_invalidos: { kind: "invalid_input", retryable: false },
  fondos_insuficientes: { kind: "insufficient_funds", retryable: false },
  emisor_bloqueado: { kind: "issuer_blocked", retryable: false },
  tx_rechazada: { kind: "tx_rejected", retryable: false },
  clave_rechazada: { kind: "service_key", retryable: false },
  respuesta_inesperada: { kind: "unexpected_response", retryable: true },
  firma_invalida: { kind: "bad_signature", retryable: true },
  reto_expirado: { kind: "challenge_expired", retryable: true },
};

export function mapError(error) {
  if (error instanceof TxError) return error;

  if (error && error.name === "WalletError") {
    return new TxError(WALLET_KINDS[error.codigo] || WALLET_KINDS.failed);
  }
  if (error && error.name === "ApiError") {
    const known = API_KINDS[error.codigo];
    return new TxError({ ...(known || { kind: "unknown", retryable: false }), requestId: error.requestId, field: error.field });
  }
  return new TxError({ kind: "unknown", retryable: false });
}
