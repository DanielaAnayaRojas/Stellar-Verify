// Fuente de CONCEPTO del panel: Instituciones y Verificaciones. Son ideas para después del MVP, no funciones
// del producto: hoy hay una sola institución y no existe un registro de verificaciones. Sus datos son ficticios
// y solo se muestran con VITE_CONCEPTO=1 (en local o en una vista previa), siempre rotulados. En producción
// quedan apagadas. Funciones puras: reciben los datos para poder probarlas con node:test.

export function conceptoActivo(env = import.meta.env) {
  return env?.VITE_CONCEPTO === "1";
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export const CATEGORIAS = Object.freeze([
  ["todas", "Todas"],
  ["uni", "Universidades"],
  ["inst", "Institutos"],
  ["org", "Organizaciones"],
  ["pub", "Entidad pública"],
]);

export function contarCategorias(datos) {
  const cuenta = Object.fromEntries(CATEGORIAS.map(([id]) => [id, 0]));
  for (const inst of datos.instituciones) {
    cuenta.todas += 1;
    if (inst.cat in cuenta) cuenta[inst.cat] += 1;
  }
  return cuenta;
}

// Lista filtrada por categoría y texto, ordenada por credenciales emitidas.
export function listarInstituciones(datos, { cat = "todas", q = "", orden = "desc" } = {}) {
  const buscado = normalizar(q);
  const lista = datos.instituciones.filter(
    (inst) => (cat === "todas" || inst.cat === cat) && (!buscado || normalizar(`${inst.nombre} ${inst.ciudad}`).includes(buscado)),
  );
  return lista.sort((a, b) => (orden === "asc" ? a.credenciales - b.credenciales : b.credenciales - a.credenciales));
}

export const RANGOS = Object.freeze([7, 30, 90]);

// Resumen de verificaciones para un rango (7, 30 o 90 días), con los porcentajes ya emparejados con su etiqueta.
export function verificacionesDe(datos, rango) {
  const v = datos.verificaciones;
  const r = v[String(rango)];
  if (!r) return null;
  return {
    total: r.total,
    validez: r.validez,
    paises: r.paises,
    empresas: r.empresas,
    tipos: v.ordenTipos.map((tipo, i) => ({ tipo, label: datos.tiposCredencial[tipo]?.label ?? tipo, pct: r.tipos[i] })),
    porPais: v.ordenPaises.map((nombre, i) => ({ nombre, pct: r.paisesPct[i], pin: v.pinesMapa[nombre] ?? null })),
    dispositivos: v.ordenDispositivos.map((nombre, i) => ({ nombre, pct: r.dispositivos[i] })),
  };
}
