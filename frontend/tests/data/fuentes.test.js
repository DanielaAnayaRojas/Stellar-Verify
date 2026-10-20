import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { leerBoveda, leerCredencial, leerMas, olvidarBoveda, VIGENCIA_MEMORIA_MS } from "../../src/data/real.js";
import { DURACION_SESION_MS, REVISAR_CADA_MS, msHastaAvisoFin, msHastaRevisar } from "../../src/data/plazos.js";
import { CATEGORIAS, conceptoActivo, contarCategorias, listarInstituciones, verificacionesDe } from "../../src/data/concepto.js";
import { guardarEnMemoria, leerDeMemoria, olvidarMemoria } from "../../src/services/lista.js";
import datos from "../../src/data/concepto.json" with { type: "json" };

const hex = (c) => c.repeat(64);

function apiFalsa(paginas) {
  const llamadas = [];
  return {
    llamadas,
    async listCredentials({ offset, limit }) {
      llamadas.push({ offset, limit });
      return paginas[offset];
    },
  };
}

describe("fuente real del panel", () => {
  beforeEach(() => olvidarBoveda());

  it("lee la primera página una sola vez y la reutiliza desde memoria", async () => {
    const api = apiFalsa({ 0: { items: [{ huella: hex("a"), estado: "valida", curso: "Curso A", fecha: "2026-10-18" }], offset: 0, limit: 10, total: 1, hasMore: false } });
    const primera = await leerBoveda({ api });
    const segunda = await leerBoveda({ api });
    assert.equal(api.llamadas.length, 1);
    assert.deepEqual(api.llamadas[0], { offset: 0, limit: 10 });
    assert.deepEqual(segunda, primera);
    assert.equal(primera.total, 1);
    assert.equal(primera.filas[0].curso, "Curso A");
  });

  it("la memoria sirve también a la lista anterior: ítems crudos con el vocabulario del servidor", async () => {
    const items = [{ huella: hex("a"), estado: "no_encontrada", sospechosa: false }, { huella: "", estado: "valida" }, { huella: hex("b"), estado: "emisor_no_reconocido", sospechosa: true, revocable: true }];
    const api = apiFalsa({ 0: { items, offset: 0, limit: 10, total: 3, hasMore: false } });
    const lista = await leerBoveda({ api });
    const memoria = leerDeMemoria();
    assert.deepEqual(memoria.filas, [items[0], items[2]], "la lista anterior recibe los ítems tal como llegan (sin los mal formados)");
    assert.deepEqual({ siguiente: memoria.siguiente, hayMas: memoria.hayMas, total: memoria.total }, { siguiente: 10, hayMas: false, total: 3 });
    assert.deepEqual(lista.filas.map((f) => f.estado), ["noEncontrada", "noConfirmada"], "esta UI recibe su propio modelo");
  });

  it("no reutiliza una memoria con otra forma (la de la lista anterior del panel)", async () => {
    guardarEnMemoria({ filas: [{ huella: "vieja" }], total: 9 });
    const api = apiFalsa({ 0: { items: [], offset: 0, limit: 10, total: 0, hasMore: false } });
    const lista = await leerBoveda({ api });
    assert.equal(api.llamadas.length, 1);
    assert.equal(lista.total, 0);
    assert.equal(leerDeMemoria().origen, "ui-tech");
  });

  it("leerMas pide la página siguiente y la une sin repetir", async () => {
    const api = apiFalsa({
      0: { items: [{ huella: hex("a"), estado: "valida" }], offset: 0, limit: 10, total: 2, hasMore: true },
      10: { items: [{ huella: hex("a"), estado: "valida" }, { huella: hex("b"), estado: "revocada" }], offset: 10, limit: 10, total: 2, hasMore: false },
    });
    const lista = await leerMas(await leerBoveda({ api }), { api });
    assert.deepEqual(api.llamadas.map((l) => l.offset), [0, 10]);
    assert.deepEqual(lista.filas.map((f) => f.huella), [hex("a"), hex("b")]);
    assert.equal(lista.hayMas, false);
    assert.deepEqual(leerDeMemoria().filas.map((f) => f.huella), [hex("a"), hex("b")], "los crudos también se unen sin repetir");
    assert.deepEqual(leerDeMemoria().vista, lista.filas);
  });

  it("leerMas no guarda una lista a medias si la memoria se olvidó entre páginas", async () => {
    const api = apiFalsa({
      0: { items: [{ huella: hex("a"), estado: "valida" }], offset: 0, limit: 10, total: 2, hasMore: true },
      10: { items: [{ huella: hex("b"), estado: "valida" }], offset: 10, limit: 10, total: 2, hasMore: false },
    });
    const primera = await leerBoveda({ api });
    olvidarBoveda();
    const lista = await leerMas(primera, { api });
    assert.equal(lista.filas.length, 2);
    assert.equal(leerDeMemoria(), null);
  });

  it("los errores de la API se propagan (la pantalla decide: sesión, límite o servicio)", async () => {
    const fallo = Object.assign(new Error("limite"), { status: 429, codigo: "limite" });
    await assert.rejects(leerBoveda({ api: { listCredentials: async () => { throw fallo; } } }), fallo);
    assert.equal(leerDeMemoria(), null);
  });

  it("usarMemoria: false relee aunque haya memoria reciente (es lo que hacen «Actualizar» e «Intentar de nuevo»)", async () => {
    const api = apiFalsa({ 0: { items: [], offset: 0, limit: 10, total: 0, hasMore: false } });
    await leerBoveda({ api });
    await leerBoveda({ api, usarMemoria: false });
    assert.equal(api.llamadas.length, 2);
  });

  it("la memoria caduca a los 2 minutos (lo revocado en otra pestaña aparece al volver)", async () => {
    const api = apiFalsa({ 0: { items: [], offset: 0, limit: 10, total: 0, hasMore: false } });
    let reloj = 1_000_000;
    await leerBoveda({ api, ahora: () => reloj });
    reloj += VIGENCIA_MEMORIA_MS - 1;
    await leerBoveda({ api, ahora: () => reloj });
    assert.equal(api.llamadas.length, 1, "dentro del plazo usa la memoria");
    reloj += 2;
    await leerBoveda({ api, ahora: () => reloj });
    assert.equal(api.llamadas.length, 2, "vencida, relee");
  });

  it("una lectura que termina después de salir no vuelve a llenar la memoria", async () => {
    let soltar;
    const api = { listCredentials: () => new Promise((r) => (soltar = r)) };
    const lectura = leerBoveda({ api });
    olvidarBoveda();
    soltar({ items: [{ huella: hex("a"), estado: "valida" }], offset: 0, limit: 10, total: 1, hasMore: false });
    const lista = await lectura;
    assert.equal(lista.filas.length, 1, "quien la pidió recibe su resultado");
    assert.equal(leerDeMemoria(), null, "pero no queda guardada para la próxima sesión");
  });

  function respuesta(status, cuerpo) {
    return async () => ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo });
  }

  it("leerCredencial traduce la verificación y conserva el motivo del límite", async () => {
    const valida = await leerCredencial(hex("a"), { fetchImpl: respuesta(200, { estado: "valida", institucion: "Institución de prueba", curso: "C", fecha: "2026-10-18" }) });
    assert.deepEqual(valida, { huella: hex("a"), estado: "valida", institucion: "Institución de prueba", curso: "C", fecha: "2026-10-18", revocadaEl: null, motivo: null });
    const limite = await leerCredencial(hex("b"), { fetchImpl: respuesta(200, { estado: "no_verificable", motivo: "limite" }) });
    assert.equal(limite.estado, "sinComprobar");
    assert.equal(limite.motivo, "limite");
    const caida = await leerCredencial(hex("c"), { fetchImpl: respuesta(503, { error: "no_disponible" }) });
    assert.equal(caida.estado, "sinComprobar");
  });

  it("leerCredencial con la red caída lanza status 0 (la pantalla dice «No hay conexión»)", async () => {
    await assert.rejects(
      leerCredencial(hex("a"), { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
      (e) => e.status === 0 && e.codigo === "sin-conexion",
    );
  });

  it("si otra pantalla olvida la memoria durante una lectura (emitir o revocar), la lectura no la rellena", async () => {
    const primera = apiFalsa({ 0: { items: [{ huella: hex("a"), estado: "valida" }], offset: 0, limit: 10, total: 1, hasMore: false } });
    await leerBoveda({ api: primera });
    let soltar;
    const lenta = { listCredentials: () => new Promise((r) => (soltar = r)) };
    const lectura = leerBoveda({ api: lenta, usarMemoria: false });
    olvidarMemoria();
    soltar({ items: [{ huella: hex("a"), estado: "valida" }], offset: 0, limit: 10, total: 1, hasMore: false });
    await lectura;
    assert.equal(leerDeMemoria(), null);
  });

  it("leerCredencial avisa la sesión vencida (401) en vez de decir «sin comprobar»", async () => {
    await assert.rejects(leerCredencial(hex("a"), { fetchImpl: respuesta(401, { error: "no_autenticado", retryable: false }) }), (e) => e.status === 401 && e.codigo === "no_autenticado");
  });
});

describe("plazos de la sesión (el reloj del equipo puede estar desfasado)", () => {
  const ahora = Date.parse("2026-10-20T10:00:00Z");
  const en = (ms) => new Date(ahora + ms).toISOString();

  it("revisar con el servidor cuando falta lo que diga expiresAt, nunca más de 30 min ni menos de 0", () => {
    assert.equal(msHastaRevisar(en(25 * 60e3), ahora), 25 * 60e3);
    assert.equal(msHastaRevisar(en(4 * 365 * 24 * 3600e3), ahora), DURACION_SESION_MS, "una fecha lejana no desborda setTimeout");
    assert.equal(msHastaRevisar(en(-40 * 60e3), ahora), REVISAR_CADA_MS, "reloj adelantado: se pregunta en un minuto, no se cierra al instante");
    assert.equal(msHastaRevisar("no-es-fecha", ahora), REVISAR_CADA_MS);
  });

  it("el aviso de «menos de 5 minutos» solo cuando tiene sentido", () => {
    assert.equal(msHastaAvisoFin(en(25 * 60e3), ahora), 20 * 60e3);
    assert.equal(msHastaAvisoFin(en(2 * 60e3), ahora), 0, "ya dentro de los últimos 5 minutos: avisa enseguida");
    assert.equal(msHastaAvisoFin(en(-60e3), ahora), null, "ya vencida según este reloj: no avisa (lo decide el servidor)");
    assert.equal(msHastaAvisoFin(en(4 * 365 * 24 * 3600e3), ahora), null, "plazo mayor que una sesión: reloj atrasado, no avisa");
    assert.equal(msHastaAvisoFin(undefined, ahora), null);
  });
});

describe("fuente de concepto (ficticia, apagada en producción)", () => {
  it("solo se activa con VITE_CONCEPTO=1 exactamente", () => {
    assert.equal(conceptoActivo({ VITE_CONCEPTO: "1" }), true);
    for (const env of [undefined, {}, { VITE_CONCEPTO: "0" }, { VITE_CONCEPTO: "true" }, { VITE_CONCEPTO: 1 }]) assert.equal(conceptoActivo(env), false);
    assert.equal(conceptoActivo(), false, "sin variable (como en node y en producción) queda apagada");
  });

  it("los datos de concepto se declaran ficticios y no traen personas ni credenciales", () => {
    assert.match(datos._nota, /ficticios/);
    assert.equal(datos.usuario, undefined);
    assert.equal(datos.credenciales, undefined);
    assert.equal(datos.resumen, undefined);
  });

  it("cuenta y filtra instituciones por categoría y texto sin tildes, ordenadas por credenciales", () => {
    const cuenta = contarCategorias(datos);
    assert.equal(cuenta.todas, datos.instituciones.length);
    assert.equal(CATEGORIAS.slice(1).reduce((s, [id]) => s + cuenta[id], 0), cuenta.todas, "toda institución cae en una categoría conocida");
    const unis = listarInstituciones(datos, { cat: "uni" });
    assert.ok(unis.length > 0 && unis.every((i) => i.cat === "uni"));
    const desc = listarInstituciones(datos).map((i) => i.credenciales);
    assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
    const asc = listarInstituciones(datos, { orden: "asc" }).map((i) => i.credenciales);
    assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
    assert.deepEqual(listarInstituciones(datos, { q: "CONDOR" }).map((i) => i.id), ["condor"]);
  });

  it("verificacionesDe empareja porcentajes con su etiqueta y suma 100 por grupo", () => {
    for (const rango of [7, 30, 90]) {
      const v = verificacionesDe(datos, rango);
      for (const grupo of [v.tipos, v.porPais, v.dispositivos]) assert.equal(grupo.reduce((s, x) => s + x.pct, 0), 100, `rango ${rango}`);
      assert.ok(v.tipos.every((t) => typeof t.label === "string" && t.label.length > 0));
    }
    assert.equal(verificacionesDe(datos, 14), null);
  });
});
