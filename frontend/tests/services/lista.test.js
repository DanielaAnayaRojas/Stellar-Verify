import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claveDeEstado, guardarEnMemoria, juntar, leerDeMemoria, olvidarMemoria, separar } from "../../src/services/lista.js";
import textos from "../../src/content/textos.json" with { type: "json" };

const fila = (huella, extra = {}) => ({ huella, estado: "valida", sospechosa: false, ...extra });

describe("lista de credenciales del panel", () => {
  it("claveDeEstado traduce los estados del servidor y lo desconocido es 'sin comprobar', nunca 'válida'", () => {
    assert.equal(claveDeEstado("valida"), "valida");
    assert.equal(claveDeEstado("revocada"), "revocada");
    assert.equal(claveDeEstado("emisor_no_reconocido"), "emisorNoReconocido");
    assert.equal(claveDeEstado("no_verificable"), "noVerificable");
    for (const raro of [undefined, null, "", "algo_nuevo", 42]) assert.equal(claveDeEstado(raro), "noVerificable", String(raro));
  });

  it("separar manda las sospechosas a su sección y conserva el orden", () => {
    const { reales, sospechosas } = separar([fila("a"), fila("b", { sospechosa: true }), fila("c"), fila("d", { sospechosa: true })]);
    assert.deepEqual(reales.map((f) => f.huella), ["a", "c"]);
    assert.deepEqual(sospechosas.map((f) => f.huella), ["b", "d"]);
  });

  it("solo es sospechosa lo que el servidor marca true: un valor raro no esconde ni inventa nada", () => {
    const { reales, sospechosas } = separar([fila("a", { sospechosa: "sí" }), fila("b", { sospechosa: undefined })]);
    assert.equal(sospechosas.length, 0);
    assert.equal(reales.length, 2);
  });

  it("juntar agrega páginas sin repetir filas y descarta lo mal formado", () => {
    const primera = [fila("a"), fila("b")];
    const resultado = juntar(primera, [fila("b"), fila("c"), null, { huella: 5 }, { huella: "" }, { huella: "x".repeat(65) }, "texto"]);
    assert.deepEqual(resultado.map((f) => f.huella), ["a", "b", "c"]);
    assert.deepEqual(juntar([], undefined), []);
    assert.equal(primera.length, 2, "no modifica lo anterior");
  });

  it("los textos de la lista existen y llevan sus marcadores", () => {
    const lista = textos.panel.lista;
    for (const clave of ["titulo", "cargando", "error", "vacia", "cargarMas", "sospechosas", "sospechosaSello", "revisar", "yaRevocada"]) {
      assert.ok(lista[clave].length > 3, clave);
    }
    assert.match(lista.sospechosas, /\{n\}/);
    assert.match(lista.mostrando, /\{n\}/);
    assert.match(lista.mostrando, /\{total\}/);
  });

  it("la memoria guarda la última lista, y al olvidarla ya no queda nada (así no se muestra un estado viejo)", () => {
    olvidarMemoria();
    assert.equal(leerDeMemoria(), null);
    const lista = { filas: [fila("a")], siguiente: 10, hayMas: false, total: 1 };
    guardarEnMemoria(lista);
    assert.equal(leerDeMemoria(), lista);
    olvidarMemoria();
    assert.equal(leerDeMemoria(), null);
  });
});
