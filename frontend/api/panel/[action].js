import { handleRoute, jsonResponse } from "../_lib/http.js";
import { getRuntime } from "../_lib/runtime.js";
import { readJsonBody, requireSameOriginWrite, requireSession } from "../_lib/access.js";
import { errorResponse } from "../_lib/panelErrors.js";
import { logSubmit } from "../_lib/log.js";
import { GuardError, HttpError, ProviderError, ValidationError } from "../_lib/errors.js";
import { createTicket, readTicket } from "../_lib/ticket.js";
import { buildVcData, validateCourse, validateHuella, validateIssueDate } from "../_lib/vcData.js";
import { issuanceMessage } from "../_lib/issuerSignature.js";
import { assertXdrMatches, transactionExpiry } from "../_lib/xdrGuard.js";

// Panel de la institución. TODAS las rutas exigen sesión (401 sin ella) y las escrituras, la cabecera propia.
//   POST /api/panel/issue-start     { huella, course, issueDate } -> { message } (texto a firmar; null con la capa apagada)
//   POST /api/panel/issue-prepare   { huella, course, issueDate, signature? } -> { xdr, networkPassphrase, expiresAt, ticket }
//   POST /api/panel/issue-submit    { huella, signedXdr, ticket } -> { txId, confirmed }
//   POST /api/panel/revoke-prepare  { huella }                    -> { xdr, networkPassphrase, expiresAt, ticket }
//   POST /api/panel/revoke-submit   { huella, signedXdr, ticket } -> { txId, confirmed }
//   GET  /api/panel/status?huella=...&expect=valid|revoked        -> { confirmed }
//   GET  /api/panel/credential?huella=...                         -> { estado, institucion?, curso?, fecha? } (sin caché)
//   GET  /api/panel/credentials?offset=0&limit=10                 -> { items: [{ huella, estado, sospechosa, yaRevocada, revocable, curso?, fecha? }], offset, limit, total, hasMore }
//
// El servidor fija owner, issuer y sourcePublicKey desde el entorno: lo que mande el navegador se ignora.

const EXPECTED_STATUS = { issue: "valid", revoke: "revoked" };

// Lo preparado sale hacia el navegador con un ticket: el cuerpo que ACTA pedirá al enviar, firmado por el servidor.
function preparedResponse(operation, prepared, runtime, vaultAddress) {
  const ticket = createTicket({ secret: runtime.config.sessionSecret, operation, request: prepared.request, vaultAddress });
  return jsonResponse(200, {
    xdr: prepared.xdr,
    networkPassphrase: prepared.networkPassphrase,
    expiresAt: transactionExpiry(prepared.xdr),
    ticket,
  });
}

// Primera firma (solo con SIGNATURE_LAYER=on): entrega el texto que la institución firma con su wallet.
// Con la capa apagada responde { message: null } y la pantalla se salta este paso.
async function issueStart({ request, runtime }) {
  const { huella, course, issueDate } = await readJsonBody(request);
  validateHuella(huella);
  validateCourse(course);
  validateIssueDate(issueDate);
  if (runtime.config.signatureLayer !== "on") return jsonResponse(200, { message: null });
  const message = issuanceMessage({ huella, institutionDid: runtime.config.institutionDid, issueDate });
  return jsonResponse(200, { message });
}

async function prepareIssue({ request, runtime }) {
  const { huella, course, issueDate, signature } = await readJsonBody(request);
  validateHuella(huella);
  // Con la capa de firma, buildVcData comprueba la firma ANTES de preparar nada con ACTA.
  const vcDataText = buildVcData({ huella, course, issueDate, signature }, runtime.config);
  // La dirección del vault se lee ANTES de preparar: un fallo aquí no cuesta nada (la transacción aún no existe).
  const vaultAddress = await runtime.provider.getVaultAddress();
  return preparedResponse("issue", await runtime.provider.prepareIssue({ huella, vcDataText }), runtime, vaultAddress);
}

async function prepareRevoke({ request, runtime }) {
  const { huella } = await readJsonBody(request);
  validateHuella(huella);
  const vaultAddress = await runtime.provider.getVaultAddress();
  const prepared = await runtime.provider.prepareRevoke({ huella, dateIso: new Date().toISOString() });
  return preparedResponse("revoke", prepared, runtime, vaultAddress);
}

// Envía lo firmado SOLO si es exactamente lo preparado, y confirma contra verify-vc.
async function submit(operation, { request, runtime }) {
  const { huella, signedXdr, ticket } = await readJsonBody(request);
  validateHuella(huella);

  // El cuerpo que ACTA pide al enviar sale del ticket firmado por este servidor, nunca del navegador.
  const read = readTicket({ secret: runtime.config.sessionSecret, ticket, operation });
  if (!read.ok) throw new GuardError(read.reason === "expired" ? "expired" : "ticket_invalid");
  if (read.request.vcId !== huella) throw new GuardError("vc_id_mismatch");

  // La dirección sale del ticket firmado: no se lee nada de ACTA mientras corre el reloj de la transacción.
  const contractId = read.vaultAddress ?? (await runtime.provider.getVaultAddress());
  assertXdrMatches({
    signedXdr,
    functionName: operation,
    huella,
    source: runtime.config.institutionPublicKey,
    contractId,
  });

  const { txId, via } = await runtime.provider.submit({ operation, huella, request: read.request, signedXdr });
  // Lo escrito cambia el estado: esta instancia deja de servir lo anterior.
  runtime.verifier.forget(huella);

  const confirmed = await runtime.provider.waitForStatus(huella, EXPECTED_STATUS[operation]);
  logSubmit({ operation, via, confirmed });
  return jsonResponse(200, { txId, confirmed });
}

const LIST_PAGE_SIZE = 10;
const LIST_CONCURRENCY = 3;
const HEX_ID = /^[0-9a-f]{64}$/;

function readPageNumber(value, fallback, { min, max, field }) {
  if (value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new ValidationError(field, "paginacion_invalida");
  return number;
}

// Reparte el trabajo en pocas peticiones a la vez: cada fila cuesta 2 lecturas a ACTA y el límite es de 60 por minuto.
async function mapWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Lista del vault para el panel: las más recientes primero, de 10 en 10, cada una clasificada con la MISMA regla que la
// verificación pública (N2). Un registro que no es de la institución se marca "sospechosa" y no muestra sus datos.
// Nunca se revoca nada desde aquí: revocar lo hace la persona, con su firma, una por credencial.
async function credentials({ request, runtime }) {
  const params = new URL(request.url).searchParams;
  const offset = readPageNumber(params.get("offset"), 0, { min: 0, max: 100_000, field: "offset" });
  const limit = readPageNumber(params.get("limit"), LIST_PAGE_SIZE, { min: 1, max: LIST_PAGE_SIZE, field: "limit" });

  const ids = (await runtime.provider.listVcIds()).reverse();
  const page = ids.slice(offset, offset + limit);

  const items = await mapWithLimit(page, LIST_CONCURRENCY, async (id) => {
    // Esta aplicación solo emite huellas de 64 caracteres hexadecimales: cualquier otro identificador es ajeno.
    if (!HEX_ID.test(id)) {
      return { huella: id, estado: "emisor_no_reconocido", sospechosa: true, yaRevocada: false, revocable: false };
    }
    const { result, recordStatus } = await runtime.verifier.inspectFresh(id);
    const item = {
      huella: id,
      estado: result.estado,
      sospechosa: result.estado === "emisor_no_reconocido",
      yaRevocada: recordStatus === "revoked",
      revocable: true,
    };
    if (result.estado === "valida" || result.estado === "revocada") {
      item.curso = result.curso;
      item.fecha = result.fecha;
    }
    return item;
  });

  return jsonResponse(200, { items, offset, limit, total: ids.length, hasMore: offset + limit < ids.length });
}

// Estado de una credencial para el panel, sin caché (misma forma que la verificación pública).
async function credential({ request, runtime }) {
  const huella = validateHuella(new URL(request.url).searchParams.get("huella"));
  return jsonResponse(200, await runtime.verifier.verifyFresh(huella));
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
  "issue-start": { method: "POST", handler: issueStart },
  "issue-prepare": { method: "POST", handler: prepareIssue },
  "issue-submit": { method: "POST", handler: (input) => submit("issue", input) },
  "revoke-prepare": { method: "POST", handler: prepareRevoke },
  "revoke-submit": { method: "POST", handler: (input) => submit("revoke", input) },
  status: { method: "GET", handler: status },
  credential: { method: "GET", handler: credential },
  credentials: { method: "GET", handler: credentials },
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

// Con los reintentos a ACTA una petición puede tardar más que el límite por defecto de algunos planes.
export const config = { maxDuration: 30 };

export default { fetch: handleRoute("panel", handle) };
