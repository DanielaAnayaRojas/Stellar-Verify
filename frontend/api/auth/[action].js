import { handleRoute, jsonResponse } from "../_lib/http.js";
import { getRuntime } from "../_lib/runtime.js";
import { isSecureRequest, readSession, requireSameOriginWrite, readJsonBody } from "../_lib/access.js";
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  createChallenge,
  createSessionToken,
  verifyChallengeResponse,
} from "../_lib/session.js";
import { errorResponse } from "../_lib/panelErrors.js";

// Entrada al panel por reto firmado:
//   POST /api/auth/challenge  -> { nonce, expiresAt, tag, message, publicKey, institutionName }
//   POST /api/auth/verify     -> { authenticated, expiresAt, ... } y cookie de sesión
//   GET  /api/auth/session    -> { authenticated, ... }
//   POST /api/auth/logout     -> { authenticated: false } y borra la cookie

function identity(config) {
  return { publicKey: config.institutionPublicKey, institutionName: config.institutionName };
}

async function challenge({ request, runtime }) {
  const host = new URL(request.url).host;
  const issued = createChallenge({ secret: runtime.config.sessionSecret, host });
  return jsonResponse(200, { ...issued, ...identity(runtime.config) });
}

// Los fallos de la firma no dicen cuál comprobación falló, salvo que el reto caducó (se pide otro).
const LOGIN_FAILURES = { expired: [401, "reto_expirado"] };

async function login({ request, runtime }) {
  const body = await readJsonBody(request);
  const result = verifyChallengeResponse({
    secret: runtime.config.sessionSecret,
    host: new URL(request.url).host,
    institutionPublicKey: runtime.config.institutionPublicKey,
    body,
  });
  if (!result.ok) {
    const [status, error] = LOGIN_FAILURES[result.reason] ?? [401, "firma_invalida"];
    return jsonResponse(status, { error });
  }

  const { token, expiresAt } = createSessionToken({ secret: runtime.config.sessionSecret });
  return jsonResponse(
    200,
    { authenticated: true, expiresAt: new Date(expiresAt).toISOString(), ...identity(runtime.config) },
    { "set-cookie": buildSessionCookie(token, { secure: isSecureRequest(request) }) },
  );
}

async function sessionInfo({ request, runtime }) {
  const session = readSession(request, runtime.config.sessionSecret);
  if (!session.valid) return jsonResponse(200, { authenticated: false });
  return jsonResponse(200, {
    authenticated: true,
    expiresAt: new Date(session.expiresAt).toISOString(),
    ...identity(runtime.config),
  });
}

async function logout({ request }) {
  return jsonResponse(
    200,
    { authenticated: false },
    { "set-cookie": buildClearedSessionCookie({ secure: isSecureRequest(request) }) },
  );
}

const ACTIONS = {
  challenge: { method: "POST", handler: challenge },
  verify: { method: "POST", handler: login },
  session: { method: "GET", handler: sessionInfo },
  logout: { method: "POST", handler: logout },
};

async function handle(request, context) {
  const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();
  const entry = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
  if (!entry) return jsonResponse(404, { error: "no_existe" });
  if (request.method !== entry.method) return jsonResponse(405, { error: "metodo_no_permitido" });

  const runtime = getRuntime();
  if (!runtime.ok || !runtime.config.sessionSecret) {
    context.logCode = "config";
    return jsonResponse(503, { error: "sesion_no_configurada" });
  }

  try {
    if (entry.method === "POST") requireSameOriginWrite(request);
    return await entry.handler({ request, runtime });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { fetch: handleRoute("auth", handle) };
