import { handleRoute, jsonResponse } from "../_lib/http.js";
import { getRuntime } from "../_lib/runtime.js";
import { ESTADOS } from "../_lib/verification.js";

const HUELLA_PATTERN = /^[0-9a-f]{64}$/;

// GET /api/verify/:huella — verificación pública, sin cuenta. Devuelve solo lo necesario:
// { estado, institucion?, curso?, fecha?, revocadaEl? }
async function handle(request, context) {
  if (request.method !== "GET") return jsonResponse(405, { error: "metodo_no_permitido" });

  const huella = new URL(request.url).pathname.split("/").filter(Boolean).pop() ?? "";
  if (!HUELLA_PATTERN.test(huella)) return jsonResponse(400, { error: "huella_invalida" });

  const runtime = getRuntime();
  if (!runtime.ok) {
    // Sin configuración válida no se puede comprobar nada: nunca se responde "no válida".
    context.logCode = "config";
    return jsonResponse(200, { estado: ESTADOS.NO_VERIFICABLE });
  }
  return jsonResponse(200, await runtime.verifier.verify(huella));
}

// Con los reintentos a ACTA una petición puede tardar más que el límite por defecto de algunos planes.
export const config = { maxDuration: 30 };

export default { fetch: handleRoute("verify", handle) };
