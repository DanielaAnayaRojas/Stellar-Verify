import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esRevocable, leerDetalle, marcarRevocada, recargarTrasRevocar, registroVerificacion } from "../../src/data/detalle.js";

const H = "ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f";
const CUENTA = "GAXUEDUKCI7V5MSQIHWT2DSUNUR73NRK6O2H7A7F4P2XD3QFKQUGQEQS";
const detalle = (estado, extra = {}) => ({ huella: H, estado, institucion: "I", curso: "Curso", fecha: "2026-10-18", ...extra });

describe("detalle de credencial", () => {
  it("leerDetalle traduce el estado, arma enlace y genera QR solo para válidas y revocadas", async () => {
    const qr = async () => "data:qr";
    const leer = (estado, motivo) => async () => ({ estado, institucion: "I", curso: "C", fecha: "2026-10-18", ...(motivo ? { motivo } : {}) });
    const valida = await leerDetalle(H, { leer: leer("valida"), qr, origen: "https://x" });
    assert.equal(valida.estado, "valida");
    assert.equal(valida.enlace, `https://x/verificar/${H}`);
    assert.equal(valida.qr, "data:qr");
    const ajena = await leerDetalle(H, { leer: leer("emisorNoReconocido"), qr, origen: "https://x" });
    assert.equal(ajena.estado, "noConfirmada");
    assert.equal(ajena.qr, "", "no se genera QR para un registro ajeno");
    const limite = await leerDetalle(H, { leer: leer("noVerificable", "limite"), qr, origen: "https://x" });
    assert.equal(limite.estado, "sinComprobar");
    assert.equal(limite.motivo, "limite");
  });

  it("leerDetalle rechaza una huella mal formada (no es una credencial)", async () => {
    await assert.rejects(leerDetalle("xyz", { leer: async () => ({ estado: "valida" }), qr: async () => "" }), (e) => e.codigo === "no-existe");
  });

  it("si el QR falla no rompe el detalle", async () => {
    const d = await leerDetalle(H, { leer: async () => ({ estado: "valida", curso: "C", fecha: "2026-10-18", institucion: "I" }), qr: async () => { throw new Error("x"); }, origen: "https://x" });
    assert.equal(d.estado, "valida");
    assert.equal(d.qr, "");
  });

  it("marcarRevocada fija el estado confirmado sin perder el resto", () => {
    assert.equal(marcarRevocada(detalle("valida")).estado, "revocada");
    assert.equal(marcarRevocada(detalle("valida")).curso, "Curso");
    assert.equal(marcarRevocada(null), null);
  });

  it("recargarTrasRevocar lee la forma plana de leerDetalle y devuelve el detalle solo cuando ve «revocada»", async () => {
    const sleep = async () => {};
    // Dato viejo al principio, revocada al segundo intento → devuelve el detalle revocado.
    let n = 0;
    const d = await recargarTrasRevocar(H, { sleep, cargar: async () => (n++ === 0 ? detalle("valida") : detalle("revocada")) });
    assert.equal(d.estado, "revocada");
    // Si nunca sale revocada, no pisa lo ya sabido: devuelve null (la pantalla se queda en «revocada»).
    assert.equal(await recargarTrasRevocar(H, { sleep, intentos: 2, cargar: async () => detalle("valida") }), null);
    // Una lectura que lanza se reintenta y no rompe.
    assert.equal(await recargarTrasRevocar(H, { sleep, intentos: 2, cargar: async () => { throw new Error("red"); } }), null);
  });

  it("esRevocable: lo vigente y lo no confirmado; lo revocado no", () => {
    assert.equal(esRevocable(detalle("valida")), true);
    assert.equal(esRevocable(detalle("noConfirmada")), true);
    assert.equal(esRevocable(detalle("revocada")), false);
    assert.equal(esRevocable(detalle("noEncontrada")), false);
    assert.equal(esRevocable(detalle("sinComprobar")), false);
    assert.equal(esRevocable(null), false);
  });

  it("el registro tipo terminal refleja los pasos reales de cada estado", () => {
    const valida = registroVerificacion(detalle("valida"), { cuenta: CUENTA });
    assert.deepEqual(valida.map((p) => [p.etiqueta, p.valor, p.tono]), [
      ["Código del documento", "ba0f8b38…f40a5f", "ok"],
      ["Registro en la red", "encontrado", "ok"],
      ["Firma de la institución", "GAXU…QEQS · verificada", "ok"],
      ["Estado", "vigente", "ok"],
    ]);
    assert.equal(registroVerificacion(detalle("revocada"), { cuenta: CUENTA }).at(-1).tono, "mal");
    assert.deepEqual(
      registroVerificacion(detalle("noConfirmada"), { cuenta: CUENTA }).map((p) => p.tono),
      ["ok", "ok", "mal"],
    );
    const noEnc = registroVerificacion(detalle("noEncontrada"), { cuenta: CUENTA });
    assert.deepEqual(noEnc.map((p) => p.valor), ["ba0f8b38…f40a5f", "no encontrado"]);
    assert.equal(noEnc.at(-1).tono, "mal");
    const sinC = registroVerificacion(detalle("sinComprobar", { motivo: "limite" }), { cuenta: CUENTA });
    assert.equal(sinC.at(-1).tono, "pendiente");
    assert.match(sinC.at(-1).valor, /muchas consultas/);
  });
});
