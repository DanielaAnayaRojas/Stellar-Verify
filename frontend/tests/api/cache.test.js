import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTtlCache } from "../../api/_lib/cache.js";

describe("caché con caducidad", () => {
  it("guarda el valor hasta que caduca", async () => {
    let clock = 1000;
    const cache = createTtlCache({ ttlMs: 30, now: () => clock });
    let loads = 0;
    const loader = async () => ++loads;

    assert.equal(await cache.getOrLoad("a", loader), 1);
    clock += 29;
    assert.equal(await cache.getOrLoad("a", loader), 1);
    clock += 2;
    assert.equal(await cache.getOrLoad("a", loader), 2);
  });

  it("peticiones simultáneas comparten una sola carga", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    let loads = 0;
    const loader = async () => {
      loads += 1;
      return "listo";
    };
    const results = await Promise.all([
      cache.getOrLoad("k", loader),
      cache.getOrLoad("k", loader),
      cache.getOrLoad("k", loader),
    ]);
    assert.deepEqual(results, ["listo", "listo", "listo"]);
    assert.equal(loads, 1);
  });

  it("no guarda lo que shouldCache rechaza ni los fallos", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    let loads = 0;
    await cache.getOrLoad("k", async () => ++loads, { shouldCache: () => false });
    await cache.getOrLoad("k", async () => ++loads, { shouldCache: () => false });
    assert.equal(loads, 2);

    await assert.rejects(() =>
      cache.getOrLoad("f", async () => {
        throw new Error("falla");
      }),
    );
    assert.equal(await cache.getOrLoad("f", async () => "ya sirve"), "ya sirve");
  });

  it("delete y clear olvidan lo guardado", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    let loads = 0;
    const loader = async () => ++loads;
    await cache.getOrLoad("a", loader);
    cache.delete("a");
    assert.equal(await cache.getOrLoad("a", loader), 2);
    cache.clear();
    assert.equal(await cache.getOrLoad("a", loader), 3);
  });

  it("no crece sin límite", async () => {
    const cache = createTtlCache({ ttlMs: 1000, maxEntries: 2 });
    let loads = 0;
    const loader = async () => ++loads;
    await cache.getOrLoad("a", loader);
    await cache.getOrLoad("b", loader);
    await cache.getOrLoad("c", loader);
    await cache.getOrLoad("a", loader);
    assert.equal(loads, 4);
  });
});
