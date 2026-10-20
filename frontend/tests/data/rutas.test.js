import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esRutaTech } from "../../src/ui-tech/rutas.js";

describe("rutas del panel tech", () => {
  it("resumen, credenciales y detalle van a la UI tech, con o sin barra final y en mayúsculas", () => {
    assert.equal(esRutaTech("/panel"), true);
    assert.equal(esRutaTech("/panel/"), true);
    assert.equal(esRutaTech("/panel//"), true);
    assert.equal(esRutaTech("/Panel"), true, "React Router no distingue mayúsculas: el panel tampoco");
    assert.equal(esRutaTech("/PANEL/"), true);
    assert.equal(esRutaTech("/panel/credenciales"), true);
    assert.equal(esRutaTech("/panel/credenciales/"), true);
    assert.equal(esRutaTech("/panel/credencial/ba0f8b38"), true);
    assert.equal(esRutaTech("/PANEL/CREDENCIAL/ABC"), true);
  });

  it("las rutas públicas y las del panel aún no migradas siguen con el sitio actual", () => {
    for (const ruta of ["/", "/verificar/abc", "/panel/emitir", "/panel/credencial", "/panelx", "/otra", "", undefined]) {
      assert.equal(esRutaTech(ruta), false, String(ruta));
    }
  });
});
