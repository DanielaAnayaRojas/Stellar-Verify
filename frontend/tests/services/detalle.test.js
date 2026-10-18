import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { marcarRevocada, recargarTrasRevocar } from "../../src/services/detalle.js";

const HUELLA = "a".repeat(64);
const detalle = (estado) => ({ huella: HUELLA, verificacion: { estado, curso: "Curso" }, enlace: "e", qr: "q" });
const sleep = async () => {};

describe("detalle tras revocar", () => {
  it("marcarRevocada cambia solo el estado y conserva el resto", () => {
    const antes = detalle("valida");
    const despues = marcarRevocada(antes);
    assert.equal(despues.verificacion.estado, "revocada");
    assert.equal(despues.verificacion.curso, "Curso");
    assert.equal(antes.verificacion.estado, "valida", "no modifica el original");
    assert.equal(marcarRevocada(null), null);
  });

  it("reintenta si la lectura falla o sale 'no_verificable', y devuelve la primera lectura buena", async () => {
    const respuestas = [() => detalle("no_verificable"), () => { throw new Error("red"); }, () => detalle("revocada")];
    let llamadas = 0;
    const result = await recargarTrasRevocar(HUELLA, { cargar: async () => respuestas[llamadas++](), intentos: 3, sleep });
    assert.equal(result.verificacion.estado, "revocada");
    assert.equal(llamadas, 3);
  });

  it("si ninguna lectura sirve devuelve null (la pantalla se queda con 'revocada')", async () => {
    let llamadas = 0;
    const result = await recargarTrasRevocar(HUELLA, { cargar: async () => { llamadas += 1; return detalle("no_verificable"); }, intentos: 3, sleep });
    assert.equal(result, null);
    assert.equal(llamadas, 3);
  });

  it("no espera ni reintenta si la primera lectura sirve", async () => {
    let esperas = 0;
    const result = await recargarTrasRevocar(HUELLA, { cargar: async () => detalle("revocada"), sleep: async () => { esperas += 1; } });
    assert.equal(result.verificacion.estado, "revocada");
    assert.equal(esperas, 0);
  });
});
