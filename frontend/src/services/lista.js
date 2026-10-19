// Lógica de la lista de credenciales del panel (sin pantallas, para poder probarla).
// El servidor ya clasifica cada registro con la regla N2; aquí solo se ordena lo que se muestra.

const CLAVE_DE_ESTADO = {
  valida: "valida",
  revocada: "revocada",
  no_encontrada: "noEncontrada",
  emisor_no_reconocido: "emisorNoReconocido",
  no_verificable: "noVerificable",
};

// Clave de los textos y los íconos para un estado del servidor. Lo desconocido es "sin comprobar", nunca "válida".
export function claveDeEstado(estado) {
  return CLAVE_DE_ESTADO[estado] ?? "noVerificable";
}

// Solo se aceptan filas con la forma esperada: cualquier otra cosa se descarta en vez de mostrarse a medias.
function filaValida(fila) {
  return fila && typeof fila === "object" && typeof fila.huella === "string" && fila.huella.length > 0 && fila.huella.length <= 64;
}

// Agrega una página a lo ya cargado sin repetir filas (si una credencial nueva corre la lista, no se duplica).
export function juntar(previas, items) {
  const vistas = new Set(previas.map((fila) => fila.huella));
  const nuevas = (Array.isArray(items) ? items : []).filter(filaValida).filter((fila) => !vistas.has(fila.huella));
  return [...previas, ...nuevas];
}

// Separa lo cargado: las reales van a la lista principal y las sospechosas a su sección plegada.
export function separar(filas) {
  const sospechosas = [];
  const reales = [];
  for (const fila of filas) (fila.sospechosa === true ? sospechosas : reales).push(fila);
  return { reales, sospechosas };
}

// Memoria de la última lista leída: al volver al panel se muestra al instante y se actualiza por detrás, en vez de
// esperar a ACTA con la pantalla vacía. Se olvida al emitir, revocar o salir, para no mostrar un estado viejo.
let memoria = null;

export function guardarEnMemoria(lista) {
  memoria = lista;
}

export function leerDeMemoria() {
  return memoria;
}

export function olvidarMemoria() {
  memoria = null;
}
