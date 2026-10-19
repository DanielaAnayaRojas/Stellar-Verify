import { randomUUID } from "node:crypto";
import { logRequest } from "./log.js";

// Todas las respuestas son JSON, sin caché de red y sin CORS: la API es solo para el mismo origen.
export function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

// Envuelve una ruta: pone id de petición, atrapa fallos inesperados y deja el registro mínimo.
// El manejador puede anotar `context.logCode` con un código técnico para el registro.
export function handleRoute(route, handler) {
  return async function fetch(request) {
    const requestId = randomUUID();
    const context = { requestId, logCode: null };
    let status = 500;
    try {
      const response = await handler(request, context);
      status = response.status;
      response.headers.set("x-request-id", requestId);
      return response;
    } catch {
      context.logCode = "unexpected";
      return jsonResponse(500, { error: "interno", requestId }, { "x-request-id": requestId });
    } finally {
      logRequest({ requestId, route, status, code: context.logCode });
    }
  };
}
