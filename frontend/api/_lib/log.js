// Registro mínimo. Solo se escriben datos técnicos: id de petición, ruta, estado HTTP y códigos de error.
// Nunca el contenido de credenciales, cuerpos de petición, XDR, cabeceras ni claves.

function write(entry) {
  console.log(JSON.stringify(entry));
}

export function logRequest({ requestId, route, status, code = null }) {
  write({ event: "request", requestId, route, status, code });
}

export function logProviderError(error) {
  const isProviderError = error && error.name === "ProviderError";
  write({
    event: "provider_error",
    kind: isProviderError ? error.kind : "unexpected",
    operation: isProviderError ? error.operation : null,
    elapsedMs: isProviderError ? error.elapsedMs : null,
    status: isProviderError ? error.status : null,
    code: isProviderError ? error.code : null,
    actaRequestId: isProviderError ? error.requestId : null,
  });
}

// Por dónde salió una escritura: "api" (API de ACTA), "rpc" (respaldo por la red de Stellar) o "already-applied".
// Solo la operación, la vía y si se confirmó: nunca la huella, el XDR ni el ticket.
export function logSubmit({ operation, via, confirmed }) {
  write({ event: "submit", operation, via, confirmed });
}

// Un XDR firmado que no coincide con lo preparado. `argTypes` son solo los tipos de los argumentos
// ("string", "address"...), útiles para ajustar la guardia sin registrar ningún valor.
export function logGuardFailure({ reason, argTypes = null }) {
  write({ event: "guard_failure", reason, argTypes });
}
