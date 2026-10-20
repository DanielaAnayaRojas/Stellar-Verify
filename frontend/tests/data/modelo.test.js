import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aFila,
  contar,
  cuentaCorta,
  estadoDeServidor,
  estadoDeVerificacion,
  fechaCorta,
  fechaLarga,
  filtrar,
  huellaCorta,
  juntarFilas,
  pagina,
  tipoDeFallo,
} from "../../src/data/modelo.js";

const H1 = "ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f";
const H2 = "9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03";
const item = (extra = {}) => ({ huella: H1, estado: "valida", sospechosa: false, yaRevocada: false, revocable: true, curso: "Técnico en análisis de datos", fecha: "2026-10-18", ...extra });

describe("modelo del panel tech", () => {
  it("traduce los estados del servidor y del cliente al mismo vocabulario; lo desconocido es 'sin comprobar'", () => {
    assert.equal(estadoDeServidor("valida"), "valida");
    assert.equal(estadoDeServidor("revocada"), "revocada");
    assert.equal(estadoDeServidor("emisor_no_reconocido"), "noConfirmada");
    assert.equal(estadoDeServidor("no_encontrada"), "noEncontrada");
    assert.equal(estadoDeServidor("no_verificable"), "sinComprobar");
    assert.equal(estadoDeVerificacion({ estado: "emisorNoReconocido" }), "noConfirmada");
    assert.equal(estadoDeVerificacion({ estado: "noVerificable", motivo: "limite" }), "sinComprobar");
    for (const raro of [undefined, null, "", "otro", 7]) {
      assert.equal(estadoDeServidor(raro), "sinComprobar", String(raro));
      assert.equal(estadoDeVerificacion({ estado: raro }), "sinComprobar", String(raro));
    }
    assert.equal(estadoDeVerificacion(null), "sinComprobar");
  });

  it("aFila conserva solo datos reales: curso y fecha solo para válidas y revocadas", () => {
    assert.deepEqual(aFila(item()), {
      huella: H1,
      huellaEstandar: true,
      estado: "valida",
      curso: "Técnico en análisis de datos",
      fecha: "2026-10-18",
      sospechosa: false,
      yaRevocada: false,
      revocable: true,
    });
    const ajena = aFila(item({ estado: "emisor_no_reconocido", sospechosa: true, curso: "Robado", fecha: "2026-01-01" }));
    assert.equal(ajena.estado, "noConfirmada");
    assert.equal(ajena.curso, null);
    assert.equal(ajena.fecha, null);
    assert.equal(ajena.sospechosa, true);
  });

  it("aFila descarta filas mal formadas y marca los identificadores no estándar", () => {
    for (const mala of [null, 3, "x", {}, { huella: "" }, { huella: "a".repeat(65) }, { huella: 12 }]) assert.equal(aFila(mala), null);
    assert.equal(aFila(item({ huella: "id-raro" })).huellaEstandar, false);
    assert.equal(aFila(item({ fecha: "18/10/2026" })).fecha, null);
    assert.equal(aFila(item({ curso: "" })).curso, null);
  });

  it("una credencial ya revocada nunca es revocable", () => {
    assert.equal(aFila(item({ estado: "revocada", yaRevocada: true, revocable: true })).revocable, false);
    assert.equal(aFila(item({ revocable: false })).revocable, false);
  });

  it("pagina lee total, hayMas y el siguiente desplazamiento; ignora lo que no tiene forma", () => {
    const p = pagina({ items: [item(), null, item({ huella: H2 })], offset: 10, limit: 10, total: 23, hasMore: true });
    assert.equal(p.filas.length, 2);
    assert.equal(p.total, 23);
    assert.equal(p.hayMas, true);
    assert.equal(p.siguiente, 20);
    assert.deepEqual(pagina(null), { filas: [], total: 0, hayMas: false, siguiente: 0 });
    assert.equal(pagina({ items: [item()], total: -4 }).total, 1);
  });

  it("juntarFilas no repite huellas cuando una credencial nueva corre la lista", () => {
    const a = aFila(item());
    const b = aFila(item({ huella: H2 }));
    assert.deepEqual(juntarFilas([a], [a, b]).map((f) => f.huella), [H1, H2]);
  });

  it("contar y filtrar trabajan solo sobre lo cargado, por estado, curso (sin tildes) o código", () => {
    const filas = [
      aFila(item()),
      aFila(item({ huella: H2, estado: "revocada", curso: "Atención al cliente digital" })),
      aFila(item({ huella: "c".repeat(64), estado: "emisor_no_reconocido", sospechosa: true })),
    ];
    assert.deepEqual(contar(filas), { todas: 3, valida: 1, revocada: 1, noConfirmada: 1, noEncontrada: 0, sinComprobar: 0 });
    assert.deepEqual(filtrar(filas, { estado: "revocada" }).map((f) => f.huella), [H2]);
    assert.deepEqual(filtrar(filas, { q: "TECNICO en ANALISIS" }).map((f) => f.huella), [H1]);
    assert.deepEqual(filtrar(filas, { q: " 9e8a 0165 " }).map((f) => f.huella), [H2]);
    assert.equal(filtrar(filas, { q: "" }).length, 3);
    assert.equal(filtrar(filas, { estado: "valida", q: "atencion" }).length, 0);
  });

  it("formatea fechas sin zona horaria y abrevia códigos y cuentas", () => {
    assert.equal(fechaCorta("2026-10-18"), "18 oct 2026");
    assert.equal(fechaCorta("2026-01-05"), "5 ene 2026");
    assert.equal(fechaLarga("2026-10-19"), "19 de octubre de 2026");
    for (const mala of [null, "", "2026-13-01", "2026-00-10", "18 oct 2026"]) {
      assert.equal(fechaCorta(mala), null, String(mala));
      assert.equal(fechaLarga(mala), null, String(mala));
    }
    assert.equal(huellaCorta(H1), "ba0f8b38…f40a5f");
    assert.equal(huellaCorta("corto"), "corto");
    assert.equal(cuentaCorta("GAXUABCDEFGHIJKLMNOPQRSTUVWXYZQEQS"), "GAXU…QEQS");
    assert.equal(cuentaCorta(undefined), "");
  });

  it("tipoDeFallo separa sesión vencida, límite de ACTA y servicio caído", () => {
    assert.equal(tipoDeFallo({ status: 401, codigo: "no_autenticado" }), "sesion");
    assert.equal(tipoDeFallo({ status: 429, codigo: "limite" }), "limite");
    assert.equal(tipoDeFallo({ status: 0, codigo: "sin-conexion" }), "conexion");
    assert.equal(tipoDeFallo({ status: 503, codigo: "no_disponible" }), "servicio");
    assert.equal(tipoDeFallo(undefined), "servicio");
  });
});
