// Errores del proveedor. Nunca llevan el mensaje crudo de ACTA: solo un tipo y, para los registros,
// el código de error de ACTA y su id de petición (datos técnicos, sin contenido de credenciales).
//
// kind: "unavailable" | "rate_limited" | "unauthorized" | "forbidden" | "not_found" |
//       "bad_request" | "invalid_response" | "wrong_network" |
//       "tx_expired" | "tx_bad_sequence" | "tx_insufficient_funds" | "tx_rejected" | "tx_failed"
// `operation` dice en qué paso falló ("prepare-issue", "submit-api"...): solo para el registro técnico.
export class ProviderError extends Error {
  constructor(kind, { status = null, code = null, requestId = null, operation = null, elapsedMs = null } = {}) {
    super(kind);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.operation = operation;
    this.elapsedMs = elapsedMs;
  }
}

// Fallo de la petición del navegador (cuerpo ilegible, sin sesión, origen distinto...). `code` es un texto corto.
export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

// Dato de entrada inválido. `field` dice cuál campo, para que la pantalla lo marque.
export class ValidationError extends Error {
  constructor(field, code) {
    super(code);
    this.name = "ValidationError";
    this.field = field;
    this.code = code;
  }
}

// El XDR firmado no es el que el servidor preparó. `details` solo lleva datos técnicos (sin contenido).
export class GuardError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "GuardError";
    this.reason = reason;
    this.details = details;
  }
}
