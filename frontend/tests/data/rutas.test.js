import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esRutaTech } from "../../src/ui-tech/rutas.js";

describe("rutas del panel tech", () => {
  it("el resumen del panel va a la UI tech, con o sin barra final", () => {
    assert.equal(esRutaTech("/panel"), true);
    assert.equal(esRutaTech("/panel/"), true);
    assert.equal(esRutaTech("/panel//"), true);
    assert.equal(esRutaTech("/Panel"), true, "React Router no distingue mayúsculas: el panel tampoco");
    assert.equal(esRutaTech("/PANEL/"), true);
  });

  it("las rutas públicas y las del panel aún no migradas siguen con el sitio actual", () => {
    for (const ruta of ["/", "/verificar/abc", "/panel/emitir", "/panel/credencial/abc", "/panelx", "/otra", "", undefined]) {
      assert.equal(esRutaTech(ruta), false, String(ruta));
    }
  });
});
