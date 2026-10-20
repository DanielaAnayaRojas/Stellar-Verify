// Modelo de vista del panel de instituciones. Puro (sin red ni React) para probarlo con node:test.
// Traduce lo que entrega la API propia a lo que muestran las pantallas, sin inventar datos:
// el registro solo guarda curso, institución y fecha; no hay titular, tipo ni hora.

// Vocabulario único del panel, igual al de la verificación pública.
export const ESTADOS = Object.freeze(["valida", "revocada", "noConfirmada", "noEncontrada", "sinComprobar"]);

// Estado crudo del servidor (lista y /api/panel/credential) → estado del panel.
const DESDE_SERVIDOR = {
  valida: "valida",
  revocada: "revocada",
  emisor_no_reconocido: "noConfirmada",
  no_encontrada: "noEncontrada",
  no_verificable: "sinComprobar",
};

// Claves que ya usa el cliente (services/verifyApi.js) → estado del panel.
const DESDE_CLIENTE = {
  valida: "valida",
  revocada: "revocada",
  emisorNoReconocido: "noConfirmada",
  noEncontrada: "noEncontrada",
  noVerificable: "sinComprobar",
};

// Lo desconocido es "sin comprobar", nunca "válida".
export function estadoDeServidor(estado) {
  return DESDE_SERVIDOR[estado] ?? "sinComprobar";
}

export function estadoDeVerificacion(verificacion) {
  return DESDE_CLIENTE[verificacion?.estado] ?? "sinComprobar";
}

const HUELLA = /^[0-9a-f]{64}$/;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function texto(valor) {
  return typeof valor === "string" && valor.length > 0 && valor.length <= 200 ? valor : null;
}

// Una fila de GET /api/panel/credentials → fila del panel, o null si no tiene la forma esperada.
export function aFila(item) {
  if (!item || typeof item !== "object" || typeof item.huella !== "string") return null;
  if (item.huella.length === 0 || item.huella.length > 64) return null;
  const estado = estadoDeServidor(item.estado);
  const conDatos = estado === "valida" || estado === "revocada";
  return {
    huella: item.huella,
    huellaEstandar: HUELLA.test(item.huella),
    estado,
    curso: conDatos ? texto(item.curso) : null,
    fecha: conDatos && FECHA.test(item.fecha ?? "") ? item.fecha : null,
    sospechosa: item.sospechosa === true,
    yaRevocada: item.yaRevocada === true,
    revocable: item.revocable === true && item.yaRevocada !== true,
  };
}

// Respuesta completa de una página → { filas, total, hayMas, siguiente }.
export function pagina(respuesta) {
  const items = Array.isArray(respuesta?.items) ? respuesta.items : [];
  const filas = items.map(aFila).filter(Boolean);
  const offset = Number.isInteger(respuesta?.offset) ? respuesta.offset : 0;
  const limit = Number.isInteger(respuesta?.limit) ? respuesta.limit : items.length;
  const total = Number.isInteger(respuesta?.total) && respuesta.total >= 0 ? respuesta.total : filas.length;
  return { filas, total, hayMas: respuesta?.hasMore === true, siguiente: offset + limit };
}

// Junta una página nueva con lo ya cargado sin repetir huellas.
export function juntarFilas(previas, nuevas) {
  const vistas = new Set(previas.map((fila) => fila.huella));
  return [...previas, ...nuevas.filter((fila) => !vistas.has(fila.huella))];
}

// Cuenta por estado dentro de lo cargado (contar todo el registro costaría cientos de consultas a ACTA).
export function contar(filas) {
  const cuenta = { todas: filas.length, valida: 0, revocada: 0, noConfirmada: 0, noEncontrada: 0, sinComprobar: 0 };
  for (const fila of filas) cuenta[fila.estado] += 1;
  return cuenta;
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

// Filtra lo cargado por estado y por texto (curso o código del documento).
export function filtrar(filas, { estado = "todas", q = "" } = {}) {
  const buscado = normalizar(q).replace(/\s+/g, "");
  return filas.filter((fila) => {
    if (estado !== "todas" && fila.estado !== estado) return false;
    if (!buscado) return true;
    return fila.huella.startsWith(buscado) || normalizar(fila.curso).replace(/\s+/g, "").includes(buscado);
  });
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-10-18" → "18 oct 2026". Sin pasar por Date: la fecha guardada no tiene zona horaria.
export function fechaCorta(iso) {
  const partes = FECHA.exec(iso ?? "");
  if (!partes) return null;
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return null;
  return `${Number(partes[3])} ${MESES[mes - 1]} ${partes[1]}`;
}

// "2026-10-18" → "18 de octubre de 2026".
export function fechaLarga(iso) {
  const partes = FECHA.exec(iso ?? "");
  if (!partes) return null;
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return null;
  return `${Number(partes[3])} de ${MESES_LARGOS[mes - 1]} de ${partes[1]}`;
}

// Código del documento abreviado para listas: los 8 primeros y los 6 últimos caracteres.
export function huellaCorta(huella) {
  if (typeof huella !== "string") return "";
  return huella.length > 16 ? `${huella.slice(0, 8)}…${huella.slice(-6)}` : huella;
}

// Cuenta de Stellar abreviada: "GAXU…QEQS".
export function cuentaCorta(cuenta) {
  if (typeof cuenta !== "string") return "";
  return cuenta.length > 10 ? `${cuenta.slice(0, 4)}…${cuenta.slice(-4)}` : cuenta;
}

// Error de una lectura del panel → qué hacer en pantalla.
//  sesion: la sesión terminó (401) · limite: ACTA limitó las consultas · conexion: no llegó al servidor
//  (status 0 de services/panelApi.js) · servicio: cualquier otro fallo.
export function tipoDeFallo(error) {
  if (error?.status === 401 || error?.codigo === "no_autenticado") return "sesion";
  if (error?.status === 429 || error?.codigo === "limite") return "limite";
  if (error?.status === 0 || error?.codigo === "sin-conexion") return "conexion";
  return "servicio";
}
