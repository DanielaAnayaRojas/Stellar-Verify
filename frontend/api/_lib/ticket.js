import { createHmac, timingSafeEqual } from "node:crypto";

// Para enviar una transacción firmada, la API de ACTA pide el mismo cuerpo con que se preparó. Como el servidor
// no guarda estado, la preparación entrega un "ticket": ese cuerpo, firmado con HMAC y con caducidad. El navegador
// solo lo devuelve; no puede cambiarlo (la firma lo delata) y nada de lo que contiene es secreto.

export const TICKET_TTL_MS = 3 * 60 * 1000;

function tagOf(secret, payload) {
  return createHmac("sha256", secret).update(`ticket|${payload}`).digest();
}

// operation: "issue" | "revoke". request: el cuerpo enviado a ACTA al preparar.
export function createTicket({ secret, operation, request, now = Date.now() }) {
  const payload = Buffer.from(JSON.stringify({ op: operation, req: request, exp: now + TICKET_TTL_MS })).toString("base64url");
  return `${payload}.${tagOf(secret, payload).toString("base64url")}`;
}

// reason: "malformed" | "bad_tag" | "wrong_operation" | "expired"
export function readTicket({ secret, ticket, operation, now = Date.now() }) {
  if (typeof ticket !== "string") return { ok: false, reason: "malformed" };
  const [payload, tag, extra] = ticket.split(".");
  if (!payload || !tag || extra !== undefined) return { ok: false, reason: "malformed" };

  const given = Buffer.from(tag, "base64url");
  const expected = tagOf(secret, payload);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad_tag" };

  let content;
  try {
    content = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (content.op !== operation) return { ok: false, reason: "wrong_operation" };
  if (!Number.isFinite(content.exp) || now >= content.exp) return { ok: false, reason: "expired" };
  if (content.req === null || typeof content.req !== "object") return { ok: false, reason: "malformed" };
  return { ok: true, request: content.req };
}
