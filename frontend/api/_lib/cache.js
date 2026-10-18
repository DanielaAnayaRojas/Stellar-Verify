// Caché en memoria con caducidad. Vive mientras viva la instancia de la función (mejor esfuerzo).
// Si varias peticiones piden la misma clave a la vez, comparten una sola carga.

export function createTtlCache({ ttlMs, maxEntries = 500, now = () => Date.now() }) {
  const entries = new Map();
  const loading = new Map();

  function store(key, value) {
    if (entries.size >= maxEntries && !entries.has(key)) {
      entries.delete(entries.keys().next().value);
    }
    entries.set(key, { value, expiresAt: now() + ttlMs });
  }

  return {
    // `shouldCache` decide si el valor cargado se guarda (por ejemplo, no se guarda un fallo temporal).
    async getOrLoad(key, loader, { shouldCache = () => true } = {}) {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now()) return hit.value;
      if (loading.has(key)) return loading.get(key);

      const pending = (async () => {
        const value = await loader();
        if (shouldCache(value)) store(key, value);
        return value;
      })().finally(() => loading.delete(key));

      loading.set(key, pending);
      return pending;
    },
    delete(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
  };
}
