import { handleRoute, jsonResponse } from "./_lib/http.js";
import { getRuntime } from "./_lib/runtime.js";

// GET /api/health: estado del servidor y de la configuración. Sirve para el despliegue fresco.
async function handle(request, context) {
  if (request.method !== "GET") return jsonResponse(405, { error: "metodo_no_permitido" });

  const runtime = getRuntime();
  if (!runtime.ok) {
    context.logCode = "config";
    return jsonResponse(200, { ok: false, configured: false, problems: runtime.problems });
  }
  return jsonResponse(200, await runtime.health());
}

export default { fetch: handleRoute("health", handle) };
