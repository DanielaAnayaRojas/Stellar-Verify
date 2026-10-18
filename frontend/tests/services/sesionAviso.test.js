import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AVISO_ANTES_MS, msHastaAviso } from "../../src/services/sesionAviso.js";
import textos from "../../src/content/textos.json" with { type: "json" };

const MIN = 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

describe("aviso de fin de sesión", () => {
  const ahora = Date.parse("2026-10-18T10:00:00.000Z");

  it("faltan 30 minutos: el aviso sale en 25", () => {
    assert.equal(msHastaAviso(iso(ahora + 30 * MIN), ahora), 25 * MIN);
  });

  it("faltan menos de 5 minutos: el aviso sale ya (0)", () => {
    assert.equal(msHastaAviso(iso(ahora + 3 * MIN), ahora), 0);
    assert.equal(msHastaAviso(iso(ahora + AVISO_ANTES_MS), ahora), 0);
  });

  it("ya venció o la fecha no sirve: no hay aviso (null)", () => {
    assert.equal(msHastaAviso(iso(ahora - 1), ahora), null);
    assert.equal(msHastaAviso(iso(ahora), ahora), null);
    for (const malo of [undefined, null, "", "mañana", {}]) assert.equal(msHastaAviso(malo, ahora), null, String(malo));
  });

  it("los textos del aviso existen", () => {
    for (const clave of ["avisoTitulo", "avisoTexto", "avisoBoton"]) assert.ok(textos.sesion[clave].length > 5, clave);
  });
});
