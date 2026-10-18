import { handleRoute, jsonResponse } from "../_lib/http.js";
import { getRuntime } from "../_lib/runtime.js";
import { readJsonBody, requireSameOriginWrite, requireSession } from "../_lib/access.js";
import { errorResponse } from "../_lib/panelErrors.js";
import { logSubmit } from "../_lib/log.js";
import { GuardError, HttpError, ProviderError } from "../_lib/errors.js";
import { createTicket, readTicket } from "../_lib/ticket.js";
import { buildVcData, validateHuella } from "../_lib/vcData.js";
import { assertXdrMatches, transactionExpiry } from "../_lib/xdrGuard.js";

// Panel de la institución. TODAS las rutas exigen sesión (401 sin ella) y las escrituras, la cabecera propia.
//   POST /api/panel/issue-prepare   { huella, course, issueDate } -> { xdr, networkPassphrase, expiresAt, ticket }
//   POST /api/panel/issue-submit    { huella, signedXdr, ticket } -> { txId, confirmed }
//   POST /api/panel/revoke-prepare  { huella }                    -> { xdr, networkPassphrase, expiresAt, ticket }
//   POST /api/panel/revoke-submit   { huella, signedXdr, ticket } -> { txId, confirmed }
//   GET  /api/panel/status?huella=...&expect=valid|revoked        -> { confirmed }
//
// El servidor fija owner, issuer y sourcePublicKey desde el entorno: lo que mande el navegador se ignora.

const EXPECTED_STATUS = { issue: "valid", revoke: "revoked" };

// Lo preparado sale hacia el navegador con un ticket: el cuerpo que ACTA pedirá al enviar, firmado por el servidor.
function preparedResponse(operation, prepared, runtime) {
  const ticket = createTicket({ secret: runtime.config.sessionSecret, operation, request: prepared.request });
  return jsonResponse(200, {
    xdr: prepared.xdr,
    networkPassphrase: prepared.networkPassphrase,
    expiresAt: transactionExpiry(prepared.xdr),
    ticket,
  });
}

async function prepareIssue({ request, runtime }) {
  const { huella, course, issueDate } = await readJsonBody(request);
  validateHuella(huella);
  const vcDataText = buildVcData({ course, issueDate }, runtime.config);
  return preparedResponse("issue", await runtime.provider.prepareIssue({ huella, vcDataText }), runtime);
}

async function prepareRevoke({ request, runtime }) {
  const { huella } = await readJsonBody(request);
  validateHuella(huella);
  const prepared = await runtime.provider.prepareRevoke({ huella, dateIso: new Date().toISOString() });
  return preparedResponse("revoke", prepared, runtime);
}

// Envía lo firmado SOLO si es exactamente lo preparado, y confirma contra verify-vc.
async function submit(operation, { request, runtime }) {
  const { huella, signedXdr, ticket } = await readJsonBody(request);
  validateHuella(huella);

  // El cuerpo que ACTA pide al enviar sale del ticket firmado por este servidor, nunca del navegador.
  const read = readTicket({ secret: runtime.config.sessionSecret, ticket, operation });
  if (!read.ok) throw new GuardError(read.reason === "expired" ? "expired" : "ticket_invalid");
  if (read.request.vcId !== huella) throw new GuardError("vc_id_mismatch");

  const vault = await runtime.provider.getVaultInfo();
  assertXdrMatches({
    signedXdr,
    functionName: operation,
    huella,
    source: runtime.config.institutionPublicKey,
    contractId: vault.vaultAddress,
  });

  const { txId, via } = await runtime.provider.submit({ operation, huella, request: read.request, signedXdr });
  // Lo escrito cambia el estado: esta instancia deja de servir lo anterior.
  runtime.verifier.forget(huella);

  const confirmed = await runtime.provider.waitForStatus(huella, EXPECTED_STATUS[operation]);
  logSubmit({ operation, via, confirmed });
  return jsonResponse(200, { txId, confirmed });
}

// Consulta directa (sin caché) para que la pantalla espere la confirmación.
async function status({ request, runtime }) {
  const params = new URL(request.url).searchParams;
  const huella = validateHuella(params.get("huella"));
  const expect = params.get("expect");
  if (expect !== "valid" && expect !== "revoked") throw new HttpError(400, "peticion_invalida");

  try {
    const current = await runtime.provider.getStatus(huella);
    return jsonResponse(200, { confirmed: current.status === expect });
  } catch (error) {
    if (error instanceof ProviderError) return jsonResponse(200, { confirmed: false });
    throw error;
  }
}

const ACTIONS = {
  "issue-prepare": { method: "POST", handler: prepareIssue },
  "issue-submit": { method: "POST", handler: (input) => submit("issue", input) },
  "revoke-prepare": { method: "POST", handler: prepareRevoke },
  "revoke-submit": { method: "POST", handler: (input) => submit("revoke", input) },
  status: { method: "GET", handler: status },
};

async function handle(request, context) {
  const runtime = getRuntime();
  if (!runtime.ok || !runtime.config.sessionSecret) {
    context.logCode = "config";
    return jsonResponse(503, { error: "sesion_no_configurada" });
  }

  try {
    // Primero la sesión: sin ella, ni siquiera se dice qué rutas existen.
    requireSession(request, runtime.config.sessionSecret);

    const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();
    const entry = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
    if (!entry) return jsonResponse(404, { error: "no_existe" });
    if (request.method !== entry.method) return jsonResponse(405, { error: "metodo_no_permitido" });
    if (entry.method === "POST") requireSameOriginWrite(request);

    return await entry.handler({ request, runtime });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { fetch: handleRoute("panel", handle) };
