import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";
import {
  CHALLENGE_TTL_MS,
  SESSION_TTL_MS,
  buildClearedSessionCookie,
  buildSessionCookie,
  challengeMessage,
  createChallenge,
  createSessionToken,
  decodeSignature,
  parseCookies,
  readSessionToken,
  verifyChallengeResponse,
} from "../../api/_lib/session.js";
import { ENV } from "../fixtures.js";

const SECRET = ENV.SESSION_SECRET;
const HOST = "stellar-verify.test";
const keypair = Keypair.random();

function answer(challenge, signer = keypair, overrides = {}) {
  return {
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    tag: challenge.tag,
    signature: Buffer.from(signer.signMessage(challenge.message)).toString("base64"),
    ...overrides,
  };
}

function check(body, overrides = {}) {
  return verifyChallengeResponse({ secret: SECRET, host: HOST, institutionPublicKey: keypair.publicKey(), body, ...overrides });
}

describe("reto firmado para entrar al panel", () => {
  it("el reto lleva nonce, caducidad de 2 minutos, etiqueta y el mensaje a firmar", () => {
    const now = Date.parse("2026-10-18T12:00:00.000Z");
    const challenge = createChallenge({ secret: SECRET, host: HOST, now });
    assert.match(challenge.nonce, /^[0-9a-f]{32}$/);
    assert.equal(challenge.expiresAt, new Date(now + CHALLENGE_TTL_MS).toISOString());
    assert.equal(challenge.message, `stellar-verify login|${challenge.nonce}|${challenge.expiresAt}|${HOST}`);
    assert.equal(challenge.message, challengeMessage({ nonce: challenge.nonce, expiresAt: challenge.expiresAt, host: HOST }));
    assert.notEqual(createChallenge({ secret: SECRET, host: HOST }).nonce, challenge.nonce);
  });

  it("firmado por la institución, el reto verifica (SEP-53, como lo firma Freighter)", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    assert.deepEqual(check(answer(challenge)), { ok: true });
  });

  it("acepta la firma también en hexadecimal", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    const signature = Buffer.from(keypair.signMessage(challenge.message)).toString("hex");
    assert.deepEqual(check(answer(challenge, keypair, { signature })), { ok: true });
  });

  it("un reto caducado no entra", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST, now: Date.now() - 10 * 60 * 1000 });
    assert.deepEqual(check(answer(challenge)), { ok: false, reason: "expired" });
  });

  it("una firma de otra cuenta no entra", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    assert.deepEqual(check(answer(challenge, Keypair.random())), { ok: false, reason: "bad_signature" });
  });

  it("la firma vale solo para este sitio: otro host no entra", () => {
    const challenge = createChallenge({ secret: SECRET, host: "otro-sitio.test" });
    assert.deepEqual(check(answer(challenge)), { ok: false, reason: "bad_signature" });
  });

  it("alterar el nonce, la caducidad o la etiqueta invalida el reto", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    const later = new Date(Date.parse(challenge.expiresAt) + 60 * 1000).toISOString();
    assert.equal(check(answer(challenge, keypair, { nonce: "a".repeat(32) })).reason, "bad_tag");
    assert.equal(check(answer(challenge, keypair, { expiresAt: later })).reason, "bad_tag");
    assert.equal(check(answer(challenge, keypair, { tag: `${challenge.tag.slice(0, -2)}AA` })).reason, "bad_tag");
  });

  it("un reto con otro secreto no entra", () => {
    const challenge = createChallenge({ secret: "otro-secreto-distinto-0123456789-abcdef", host: HOST });
    assert.equal(check(answer(challenge)).reason, "bad_tag");
  });

  it("cuerpos mal formados se rechazan sin lanzar", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    for (const body of [null, {}, { nonce: 1 }, answer(challenge, keypair, { nonce: "xyz" }), answer(challenge, keypair, { expiresAt: "ayer" })]) {
      assert.equal(check(body).ok, false);
    }
    assert.equal(check(answer(challenge, keypair, { signature: "no es una firma" })).reason, "bad_signature");
    assert.equal(check(answer(challenge, keypair, { signature: 42 })).reason, "bad_signature");
  });

  it("decodeSignature solo acepta 64 bytes", () => {
    assert.equal(decodeSignature(Buffer.alloc(64, 1).toString("base64")).length, 64);
    assert.equal(decodeSignature(Buffer.alloc(63, 1).toString("base64")), null);
    assert.equal(decodeSignature("abc"), null);
    assert.equal(decodeSignature(undefined), null);
  });
});

describe("sesión del panel", () => {
  it("un token recién creado es válido y caduca a los 30 minutos", () => {
    const now = Date.now();
    const { token, expiresAt } = createSessionToken({ secret: SECRET, now });
    assert.equal(expiresAt, now + SESSION_TTL_MS);
    assert.deepEqual(readSessionToken({ secret: SECRET, token, now: now + 1000 }), { valid: true, expiresAt });
    assert.equal(readSessionToken({ secret: SECRET, token, now: expiresAt }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token, now: expiresAt + 1 }).valid, false);
  });

  it("no sirve con otro secreto, alterado, incompleto o de otro tipo", () => {
    const { token } = createSessionToken({ secret: SECRET });
    const [payload, tag] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "institution", iat: 0, exp: Date.now() + 10 ** 9 })).toString("base64url");

    assert.equal(readSessionToken({ secret: "otro-secreto-distinto-0123456789-abcdef", token }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: `${forged}.${tag}` }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: `${payload}.${tag}x` }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: payload }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: `${token}.extra` }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: "" }).valid, false);
    assert.equal(readSessionToken({ secret: SECRET, token: undefined }).valid, false);
  });

  it("la etiqueta de un reto no sirve como sesión", () => {
    const challenge = createChallenge({ secret: SECRET, host: HOST });
    const payload = Buffer.from(JSON.stringify({ sub: "institution", exp: Date.now() + 10 ** 6 })).toString("base64url");
    assert.equal(readSessionToken({ secret: SECRET, token: `${payload}.${challenge.tag}` }).valid, false);
  });

  it("la cookie es HttpOnly, SameSite=Strict, dura 30 min y es Secure solo con https", () => {
    const cookie = buildSessionCookie("abc.def", { secure: true });
    for (const part of ["sv_session=abc.def", "HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=1800", "Secure"]) {
      assert.ok(cookie.includes(part), part);
    }
    assert.equal(buildSessionCookie("abc.def", { secure: false }).includes("Secure"), false);
  });

  it("la cookie de salida expira de inmediato", () => {
    const cleared = buildClearedSessionCookie({ secure: true });
    assert.ok(cleared.startsWith("sv_session=;"));
    assert.ok(cleared.includes("Max-Age=0"));
  });

  it("parseCookies lee varias cookies", () => {
    const cookies = parseCookies("a=1; sv_session=tok.en; otra=x=y");
    assert.equal(cookies.get("sv_session"), "tok.en");
    assert.equal(cookies.get("otra"), "x=y");
    assert.equal(parseCookies(null).size, 0);
  });
});
