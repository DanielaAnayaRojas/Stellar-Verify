import { HttpError } from "./errors.js";
import { SESSION_COOKIE, parseCookies, readSessionToken } from "./session.js";

// Control de acceso del panel: sesión por cookie y protección contra peticiones desde otros sitios.

export const WRITE_HEADER = "x-sv-request";
const MAX_BODY_BYTES = 20 * 1024;

export function isSecureRequest(request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  return (forwarded ? forwarded.split(",")[0].trim() : new URL(request.url).protocol.replace(":", "")) === "https";
}

// Host público de la petición. Detrás de un proxy (Vercel) la dirección interna de `request.url` puede no ser la
// que ve el navegador, así que se prefiere `x-forwarded-host`; en local solo existe `host`.
export function requestHost(request) {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("host") || new URL(request.url).host;
}

// Origen público esperado (esquema + host) para comparar con la cabecera `Origin` del navegador.
export function requestOrigin(request) {
  return `${isSecureRequest(request) ? "https" : "http"}://${requestHost(request)}`;
}

// Devuelve { valid, expiresAt } según la cookie de sesión.
export function readSession(request, secret) {
  const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
  return readSessionToken({ secret, token });
}

// Lanza 401 si no hay sesión válida.
export function requireSession(request, secret) {
  const session = readSession(request, secret);
  if (!session.valid) throw new HttpError(401, "no_autenticado");
  return session;
}

// Las escrituras exigen una cabecera propia (los formularios de otros sitios no pueden enviarla) y,
// si el navegador manda `Origin`, que sea este mismo sitio.
export function requireSameOriginWrite(request) {
  if (request.headers.get(WRITE_HEADER) !== "1") throw new HttpError(403, "peticion_no_permitida");
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== requestOrigin(request)) throw new HttpError(403, "origen_no_permitido");
}

// Lee el cuerpo JSON con tope de tamaño (20 KB).
export async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "cuerpo_demasiado_grande");

  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "cuerpo_demasiado_grande");

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "json_invalido");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "json_invalido");
  return body;
}
