import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { armarEnlace, enlaceTransaccion, validarDatos } from "../../src/services/emision.js";
import { fechaLocalHoy } from "../../src/services/formato.js";

describe("datos de la emisión", () => {
  it("curso y fecha válidos no dan errores", () => {
    assert.deepEqual(validarDatos({ curso: "Curso de diseño de interfaces", fecha: "2026-10-18" }), {});
    assert.deepEqual(validarDatos({ curso: "  x  ", fecha: "2026-02-28" }), {});
  });

  it("curso vacío, demasiado largo o con saltos de línea", () => {
    assert.equal(validarDatos({ curso: "", fecha: "2026-10-18" }).curso, "curso-vacio");
    assert.equal(validarDatos({ curso: "   ", fecha: "2026-10-18" }).curso, "curso-vacio");
    assert.equal(validarDatos({ curso: "x".repeat(121), fecha: "2026-10-18" }).curso, "curso-invalido");
    assert.equal(validarDatos({ curso: "Línea 1\nLínea 2", fecha: "2026-10-18" }).curso, "curso-invalido");
    assert.equal(validarDatos({ curso: "x".repeat(120), fecha: "2026-10-18" }).curso, undefined);
  });

  it("fecha: solo YYYY-MM-DD reales", () => {
    for (const fecha of ["", "18/10/2026", "2026-10-1", "2026-02-31", "2026-13-01", undefined]) {
      assert.equal(validarDatos({ curso: "Curso", fecha }).fecha, "fecha-invalida", String(fecha));
    }
  });

  it("no existe ningún campo para el nombre del titular", () => {
    const errores = validarDatos({ curso: "", fecha: "", titular: "", logro: "" });
    assert.deepEqual(Object.keys(errores).sort(), ["curso", "fecha"]);
  });

  it("el enlace de verificación usa el origen de la página", () => {
    assert.equal(armarEnlace("a".repeat(64), "https://stellar-verify.vercel.app"), `https://stellar-verify.vercel.app/verificar/${"a".repeat(64)}`);
  });

  it("el enlace al explorador solo se arma con un hash válido", () => {
    const hash = "b".repeat(64);
    assert.equal(enlaceTransaccion(hash), `https://stellar.expert/explorer/testnet/tx/${hash}`);
    for (const bad of ["", "abc", `${hash}0`, undefined, "javascript:alert(1)"]) assert.equal(enlaceTransaccion(bad), "");
  });
});

describe("fecha de hoy", () => {
  it("usa la hora LOCAL: pasadas las 7 p. m. en Colombia sigue siendo el mismo día", () => {
    // Se arma con partes locales: vale en cualquier zona horaria de la máquina que corra la prueba.
    assert.equal(fechaLocalHoy(new Date(2026, 9, 18, 22, 30)), "2026-10-18");
    assert.equal(fechaLocalHoy(new Date(2026, 0, 5, 0, 5)), "2026-01-05");
    assert.equal(fechaLocalHoy(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  });
});
