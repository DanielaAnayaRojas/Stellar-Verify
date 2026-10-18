import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatearFecha } from "../../src/services/formato.js";

describe("formato de fechas", () => {
  it("parte el texto: no corre el día por la zona horaria", () => {
    const original = process.env.TZ;
    for (const zona of ["America/Bogota", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
      process.env.TZ = zona;
      assert.equal(formatearFecha("2026-10-16"), "16 de octubre de 2026", zona);
      assert.equal(formatearFecha("2026-01-01"), "1 de enero de 2026", zona);
      assert.equal(formatearFecha("2026-12-31"), "31 de diciembre de 2026", zona);
    }
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it("acepta una marca de tiempo larga y toma solo la fecha", () => {
    assert.equal(formatearFecha("2026-10-17T18:17:47Z"), "17 de octubre de 2026");
  });

  it("vacío da vacío y lo que no es fecha se devuelve tal cual", () => {
    assert.equal(formatearFecha(""), "");
    assert.equal(formatearFecha(null), "");
    assert.equal(formatearFecha("ayer"), "ayer");
    assert.equal(formatearFecha("2026-13-01"), "2026-13-01");
  });
});
