import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

// Entrada al panel por reto firmado (N7), sin estado en el servidor:
//  1. El servidor entrega un reto (nonce + caducidad + etiqueta HMAC + mensaje).
//  2. La institución firma el mensaje con su wallet (Freighter, SEP-53).
//  3. El servidor comprueba la etiqueta, la caducidad y la firma contra INSTITUTION_PUBLIC_KEY y
//     entrega una sesión corta en una cookie HttpOnly.
// Riesgo aceptado para el MVP: un reto firmado puede reutilizarse durante sus 2 minutos (no hay estado).

export const CHALLENGE_TTL_MS = 2 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const SESSION_COOKIE = "sv_session";

const NONCE_PATTERN = /^[0-9a-f]{32}$/;
const SIGNATURE_BYTES = 64;

function hmac(secret, text) {
  return createHmac("sha256", secret).update(text).digest();
}

function sameBytes(a, b) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function challengeMessage({ nonce, expiresAt, host }) {
  return `stellar-verify login|${nonce}|${expiresAt}|${host}`;
}

export function createChallenge({ secret, host, now = Date.now(), nonce = randomBytes(16).toString("hex") }) {
  const expiresAt = new Date(now + CHALLENGE_TTL_MS).toISOString();
  // El prefijo separa este uso del secreto del de la cookie de sesión.
  const tag = hmac(secret, `challenge|${nonce}|${expiresAt}`).toString("base64url");
  return { nonce, expiresAt, tag, message: challengeMessage({ nonce, expiresAt, host }) };
}

// Freighter entrega la firma como texto base64 (88 caracteres); se aceptan también hexadecimal.
export function decodeSignature(text) {
  if (typeof text !== "string") return null;
  const value = text.trim();
  if (/^[0-9a-fA-F]{128}$/.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    const bytes = Buffer.from(value, "base64");
    return bytes.length === SIGNATURE_BYTES ? bytes : null;
  }
  return null;
}

// reason: "malformed" | "bad_tag" | "expired" | "bad_signature"
export function verifyChallengeResponse({ secret, host, institutionPublicKey, body, now = Date.now() }) {
  const { nonce, expiresAt, tag, signature } = body ?? {};
  if (typeof nonce !== "string" || !NONCE_PATTERN.test(nonce)) return { ok: false, reason: "malformed" };
  if (typeof expiresAt !== "string" || typeof tag !== "string") return { ok: false, reason: "malformed" };

  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs) || new Date(expiresMs).toISOString() !== expiresAt) {
    return { ok: false, reason: "malformed" };
  }

  const expected = hmac(secret, `challenge|${nonce}|${expiresAt}`);
  if (!sameBytes(Buffer.from(tag, "base64url"), expected)) return { ok: false, reason: "bad_tag" };
  if (now > expiresMs) return { ok: false, reason: "expired" };

  const signatureBytes = decodeSignature(signature);
  if (!signatureBytes) return { ok: false, reason: "bad_signature" };

  let valid = false;
  try {
    valid = Keypair.fromPublicKey(institutionPublicKey).verifyMessage(
      challengeMessage({ nonce, expiresAt, host }),
      signatureBytes,
    );
  } catch {
    valid = false;
  }
  return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
}

export function createSessionToken({ secret, now = Date.now() }) {
  const expiresAt = now + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ sub: "institution", iat: now, exp: expiresAt })).toString("base64url");
  const tag = hmac(secret, `session|${payload}`).toString("base64url");
  return { token: `${payload}.${tag}`, expiresAt };
}

export function readSessionToken({ secret, token, now = Date.now() }) {
  const invalid = { valid: false, expiresAt: null };
  if (typeof token !== "string") return invalid;
  const [payload, tag, extra] = token.split(".");
  if (!payload || !tag || extra !== undefined) return invalid;

  if (!sameBytes(Buffer.from(tag, "base64url"), hmac(secret, `session|${payload}`))) return invalid;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (sub !== "institution" || !Number.isFinite(exp) || now >= exp) return invalid;
    return { valid: true, expiresAt: exp };
  } catch {
    return invalid;
  }
}

export function parseCookies(header) {
  const cookies = new Map();
  for (const part of String(header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}

// HttpOnly (el navegador no la lee con JavaScript), SameSite=Strict (no viaja desde otros sitios) y
// Secure cuando el sitio va por https. En localhost (http) no se puede marcar Secure.
export function buildSessionCookie(token, { secure, maxAgeSeconds = SESSION_TTL_MS / 1000 }) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function buildClearedSessionCookie({ secure }) {
  return buildSessionCookie("", { secure, maxAgeSeconds: 0 });
}
