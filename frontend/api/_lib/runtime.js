import { loadConfig } from "./config.js";
import { createActaProvider } from "./provider/acta.js";
import { createVerifier } from "./verification.js";
import { buildHealthReport } from "./healthReport.js";
import { createTtlCache } from "./cache.js";

// Arma una sola vez por instancia: configuración, proveedor y verificador.
// Una configuración inválida no se guarda, para que al corregirla se vuelva a intentar.

const HEALTH_TTL_MS = 30 * 1000;
let cached = null;

export function resetRuntime() {
  cached = null;
}

// `providerOptions` solo lo usan las pruebas (por ejemplo, un RPC simulado); la primera llamada arma todo.
export function getRuntime(env = process.env, providerOptions = {}) {
  if (cached) return cached;

  const loaded = loadConfig(env);
  if (!loaded.ok) return { ok: false, problems: loaded.problems };

  const { config } = loaded;
  // fetch se resuelve en cada llamada para poder sustituirlo en las pruebas.
  const provider = createActaProvider(config, {
    fetchImpl: (...args) => globalThis.fetch(...args),
    ...providerOptions,
  });
  const verifier = createVerifier({ provider, config });
  const healthCache = createTtlCache({ ttlMs: HEALTH_TTL_MS });

  cached = {
    ok: true,
    config,
    provider,
    verifier,
    health: () => healthCache.getOrLoad("health", () => buildHealthReport({ provider, config })),
  };
  return cached;
}
