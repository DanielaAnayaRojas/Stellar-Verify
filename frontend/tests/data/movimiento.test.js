import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cifra, easeOutQuart, inclinacion, morph, prefiereReducir, valorConteo } from "../../src/ui-tech/movimiento.js";

const ventana = (reducir) => ({ matchMedia: () => ({ matches: reducir }) });

describe("movimiento de la UI tech", () => {
  it("easeOutQuart va de 0 a 1, acotada fuera del rango", () => {
    assert.equal(easeOutQuart(0), 0);
    assert.equal(easeOutQuart(1), 1);
    assert.equal(easeOutQuart(-3), 0);
    assert.equal(easeOutQuart(9), 1);
    assert.ok(easeOutQuart(0.5) > 0.9, "sale rápido y frena al final");
  });

  it("valorConteo respeta el retraso y llega exacto al destino", () => {
    assert.equal(valorConteo(1248, 0), 0);
    assert.equal(valorConteo(1248, 180), 0);
    assert.equal(valorConteo(1248, 180 + 1100), 1248);
    assert.equal(valorConteo(1248, 99999), 1248);
    assert.equal(valorConteo(NaN, 500), 0);
    assert.equal(valorConteo(7, 0, { duracion: 0 }), 7);
  });

  it("inclinacion: centro plano, bordes a ±6° en Y y ±5° en X; sin caja no inclina", () => {
    const caja = { left: 100, top: 50, width: 400, height: 500 };
    assert.deepEqual(inclinacion(300, 300, caja), { ry: 0, rx: 0, mx: 50, my: 50 });
    const esquina = inclinacion(500, 50, caja);
    assert.equal(esquina.ry, 6);
    assert.equal(esquina.rx, 5);
    assert.deepEqual(inclinacion(9999, -9999, caja), inclinacion(500, 50, caja), "fuera de la caja se acota");
    assert.deepEqual(inclinacion(1, 1, { left: 0, top: 0, width: 0, height: 0 }), { rx: 0, ry: 0, mx: 50, my: 30 });
  });

  it("morph sin View Transitions o con movimiento reducido aplica el cambio directo", () => {
    let veces = 0;
    assert.equal(morph(() => veces++, { doc: {}, win: ventana(false) }), null);
    const conVT = { startViewTransition: () => assert.fail("no debe animar con movimiento reducido"), documentElement: { dataset: {} } };
    assert.equal(morph(() => veces++, { doc: conVT, win: ventana(true) }), null);
    assert.equal(veces, 2);
    assert.equal(prefiereReducir(undefined), false);
  });

  it("morph con View Transitions publica la dirección y la limpia al terminar", async () => {
    const dataset = {};
    let terminar;
    const doc = {
      documentElement: { dataset },
      startViewTransition(cb) {
        cb();
        return { finished: new Promise((r) => (terminar = r)) };
      },
    };
    let aplicado = false;
    morph(() => (aplicado = true), { dir: "back", doc, win: ventana(false) });
    assert.equal(aplicado, true);
    assert.equal(dataset.vtdir, "back");
    terminar();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(dataset.vtdir, undefined);
  });

  it("cifra usa el separador de miles de Colombia", () => {
    assert.equal(cifra(1248), "1.248");
    assert.equal(cifra(3.6), "4");
  });
});
