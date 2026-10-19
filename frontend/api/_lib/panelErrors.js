import { GuardError, HttpError, ProviderError, ValidationError } from "./errors.js";
import { jsonResponse } from "./http.js";
import { logGuardFailure, logProviderError } from "./log.js";

// Convierte cualquier fallo del panel en una respuesta con un código propio. Nunca sale el mensaje
// crudo de ACTA ni trazas: el texto que ve la persona lo pone el navegador a partir del código.

// Códigos de contrato de ACTA que la pantalla debe distinguir (se ramifica por `error`, nunca por `message`).
const ACTA_CODES = {
  vc_already_exists: [409, "duplicada"],
  vc_already_revoked: [409, "ya_revocada"],
  vc_not_found: [404, "no_existe"],
  issuer_not_authorized: [403, "emisor_bloqueado"],
};

function reply(status, error, retryable = false, extra = {}) {
  return jsonResponse(status, { error, retryable, ...extra });
}

export function errorResponse(error) {
  if (error instanceof HttpError) return reply(error.status, error.code);
  if (error instanceof ValidationError) return reply(400, "datos_invalidos", false, { field: error.field, code: error.code });

  if (error instanceof GuardError) {
    logGuardFailure({ reason: error.reason, argTypes: error.details.argTypes ?? null });
    // Una transacción caducada se resuelve volviendo a preparar; las demás no se reintentan.
    return error.reason === "expired" ? reply(400, "expirada", true) : reply(400, "xdr_invalido");
  }

  if (error instanceof ProviderError) {
    logProviderError(error);
    const byCode = ACTA_CODES[error.code];
    if (byCode) return reply(byCode[0], byCode[1]);

    switch (error.kind) {
      case "tx_expired":
      case "tx_bad_sequence":
        return reply(400, "expirada", true);
      case "tx_insufficient_funds":
        return reply(402, "fondos_insuficientes");
      case "tx_rejected":
      case "tx_failed":
        return reply(422, "tx_rechazada");
      case "rate_limited":
        return reply(429, "limite", true);
      case "bad_request":
        return reply(400, "peticion_invalida");
      // ACTA rechazó la llave del servidor (por ejemplo, le faltan permisos): lo debe arreglar quien la administra.
      case "unauthorized":
      case "forbidden":
        return reply(502, "clave_rechazada");
      // ACTA respondió algo con otra forma o de otra red: no se envía nada.
      case "invalid_response":
      case "wrong_network":
        return reply(502, "respuesta_inesperada", true);
      default:
        // unavailable, not_found sin código conocido
        return reply(503, "no_disponible", true);
    }
  }
  throw error;
}
