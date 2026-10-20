// Fuente real del panel: la API propia (/api/panel/*, con la sesión de la institución).
// No hay base de datos: todo se lee del registro de ACTA en la red de pruebas, a través del servidor.
import { panelApi } from "../services/panelApi.js";
import { fetchPanelVerification } from "../services/verifyApi.js";
import { leerDeMemoria, guardarEnMemoria, olvidarMemoria } from "../services/lista.js";
import { aFila, estadoDeVerificacion, juntarFilas, pagina } from "./modelo.js";

export const TAMANO_PAGINA = 10;
// La memoria evita releer la bóveda en cada visita (cada fila cuesta unas 2 consultas a ACTA, con un límite
// de unas 60 por minuto), pero caduca: lo que se revoque en otra pestaña u otro equipo aparece a los 2 minutos.
export const VIGENCIA_MEMORIA_MS = 2 * 60 * 1000;

// Cada vez que se olvida la bóveda (salir, sesión vencida) sube la generación: una lectura que empezó antes y
// termina después ya no se guarda, así "salir" la olvida de verdad aunque hubiera una petición en curso.
let generacion = 0;

export function olvidarBoveda() {
  generacion += 1;
  olvidarMemoria();
}

// La memoria es la misma de services/lista.js, compartida con la lista anterior del panel (/panel/credenciales):
// así, emitir o revocar desde las páginas anteriores la olvida también aquí. Por eso se guarda en una forma que
// las dos entienden: "filas" con los ítems crudos del servidor (lo que lee la lista anterior, con su propio
// vocabulario) y "vista" con el modelo de esta UI.
function vigente(memoria, ahora) {
  return memoria?.origen === "ui-tech" && Array.isArray(memoria.vista) && Number.isFinite(memoria.leidaEn) && ahora - memoria.leidaEn < VIGENCIA_MEMORIA_MS;
}

function aLista(memoria) {
  const { origen, leidaEn, vista, total, hayMas, siguiente } = memoria;
  return { origen, leidaEn, filas: vista, total, hayMas, siguiente };
}

// Se guarda solo si nadie olvidó la bóveda durante la lectura: ni salir/vencer (generación) ni emitir o revocar
// desde las páginas anteriores, que llaman a olvidarMemoria() directamente (había memoria y ya no la hay).
// Queda un caso sin cubrir: si no había memoria al empezar, un olvido durante la lectura no deja rastro; la
// caducidad de 2 minutos lo acota.
function guardar(memoria, { generacionInicial, habiaMemoria }) {
  const olvidadaDurante = habiaMemoria && leerDeMemoria() === null;
  if (generacionInicial === generacion && !olvidadaDurante) guardarEnMemoria(memoria);
  return aLista(memoria);
}

// Ítems crudos válidos (los mismos que acepta el modelo), sin repetir huellas.
function crudos(previos, items) {
  const vistos = new Set(previos.map((item) => item.huella));
  const nuevos = (Array.isArray(items) ? items : []).filter((item) => aFila(item) && !vistos.has(item.huella));
  return [...previos, ...nuevos];
}

// Primera página de la bóveda: de la memoria si es reciente; si no (o con usarMemoria: false), del registro.
export async function leerBoveda({ api = panelApi, usarMemoria = true, ahora = () => Date.now() } = {}) {
  const guardada = usarMemoria ? leerDeMemoria() : null;
  if (vigente(guardada, ahora())) return aLista(guardada);
  const control = { generacionInicial: generacion, habiaMemoria: leerDeMemoria() !== null };
  const respuesta = await api.listCredentials({ offset: 0, limit: TAMANO_PAGINA });
  const primera = pagina(respuesta);
  return guardar(
    { origen: "ui-tech", leidaEn: ahora(), filas: crudos([], respuesta?.items), vista: primera.filas, total: primera.total, hayMas: primera.hayMas, siguiente: primera.siguiente },
    control,
  );
}

// Página siguiente, unida a lo ya cargado.
export async function leerMas(lista, { api = panelApi, ahora = () => Date.now() } = {}) {
  const anterior = leerDeMemoria();
  const control = { generacionInicial: generacion, habiaMemoria: anterior !== null };
  const respuesta = await api.listCredentials({ offset: lista.siguiente, limit: TAMANO_PAGINA });
  const nueva = pagina(respuesta);
  const memoria = {
    origen: "ui-tech",
    leidaEn: ahora(),
    filas: crudos(anterior?.origen === "ui-tech" ? anterior.filas : [], respuesta?.items),
    vista: juntarFilas(lista.filas, nueva.filas),
    total: nueva.total,
    hayMas: nueva.hayMas,
    siguiente: nueva.siguiente,
  };
  // Si la memoria se olvidó entre una página y otra (emitir o revocar en otra pantalla), no hay ítems crudos de
  // las páginas anteriores: no se guarda una lista a medias.
  return anterior?.origen === "ui-tech" ? guardar(memoria, control) : aLista(memoria);
}

// Lectura fresca de una credencial (sin caché del servidor). Lo que no se puede comprobar sale como
// "sinComprobar" (con motivo "limite" si ACTA limitó las consultas). Si la sesión terminó (401) lanza un
// error con status 401: services/verifyApi.js lo trataría como "sin comprobar" y la pantalla pediría
// reintentar algo que nunca va a funcionar.
// Igual con la red caída: lanza status 0 ("sin-conexion") para que la pantalla diga «No hay conexión» en vez de
// culpar al registro.
export async function leerCredencial(huella, { fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  let sinSesion = false;
  let sinConexion = false;
  const verificacion = await fetchPanelVerification(huella, {
    fetchImpl: async (...args) => {
      let respuesta;
      try {
        respuesta = await fetchImpl(...args);
      } catch (fallo) {
        sinConexion = true;
        throw fallo;
      }
      if (respuesta.status === 401) sinSesion = true;
      return respuesta;
    },
  });
  if (sinSesion) throw Object.assign(new Error("no_autenticado"), { status: 401, codigo: "no_autenticado" });
  if (sinConexion) throw Object.assign(new Error("sin-conexion"), { status: 0, codigo: "sin-conexion" });
  return {
    huella,
    estado: estadoDeVerificacion(verificacion),
    institucion: verificacion.institucion ?? null,
    curso: verificacion.curso ?? null,
    fecha: verificacion.fecha ?? null,
    revocadaEl: verificacion.revocadaEl ?? null,
    motivo: verificacion.motivo ?? null,
  };
}
