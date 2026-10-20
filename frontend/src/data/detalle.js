// Datos de la pantalla de detalle de una credencial: estado real (modelo de la UI tech), enlace público, QR y el
// registro tipo terminal. El registro refleja los pasos reales de la verificación, no una secuencia inventada:
// cada línea sale del estado que devolvió el servidor y de lo que de verdad se pudo comprobar.
import { fetchPanelVerification } from "../services/verifyApi.js";
import { armarEnlace, generarQR } from "../services/emision.js";
import { prepararHuella } from "../services/verificacion.js";
import { cuentaCorta, estadoDeVerificacion, huellaCorta } from "./modelo.js";

// Lee una credencial fresca (sin caché) y arma enlace y QR. No lanza por la red: lo que no se puede comprobar
// queda como "sinComprobar". Una huella mal formada sí lanza (codigo "no-existe"): no es una credencial.
export async function leerDetalle(huella, { leer = fetchPanelVerification, qr = generarQR, origen } = {}) {
  const limpia = prepararHuella(huella, "no-existe");
  let sinConexion = false;
  const verificacion = await leer(limpia, {
    fetchImpl: async (...args) => {
      try {
        return await globalThis.fetch(...args);
      } catch (fallo) {
        sinConexion = true;
        throw fallo;
      }
    },
  });
  const estado = estadoDeVerificacion(verificacion);
  const enlace = armarEnlace(limpia, origen);
  // El QR solo tiene sentido para una credencial de la institución (válida o revocada).
  let codigoQr = "";
  if (estado === "valida" || estado === "revocada") {
    try {
      codigoQr = await qr(enlace);
    } catch {
      codigoQr = "";
    }
  }
  return {
    huella: limpia,
    estado,
    institucion: verificacion.institucion ?? null,
    curso: verificacion.curso ?? null,
    fecha: verificacion.fecha ?? null,
    revocadaEl: verificacion.revocadaEl ?? null,
    motivo: sinConexion ? "conexion" : verificacion.motivo ?? null,
    enlace,
    qr: codigoQr,
  };
}

// Estado que ya se conoce con certeza (la revocación se confirmó) aplicado sobre el detalle en pantalla.
export function marcarRevocada(detalle) {
  if (!detalle) return detalle;
  return { ...detalle, estado: "revocada" };
}

// Tras revocar, se vuelve a leer para traer lo que ve el servidor (p. ej. revocadaEl). Una lectura que falla o
// que aún dice otra cosa (dato viejo) no pisa lo que ya se sabe: se reintenta unas veces y, si no sale "revocada",
// devuelve null y la pantalla se queda con "revocada", que es lo confirmado.
export async function recargarTrasRevocar(
  huella,
  { cargar = leerDetalle, intentos = 3, esperaMs = 2000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {},
) {
  for (let intento = 0; intento < intentos; intento += 1) {
    if (intento > 0) await sleep(esperaMs);
    try {
      const d = await cargar(huella);
      if (d.estado === "revocada") return d;
    } catch {
      // se reintenta
    }
  }
  return null;
}

// ¿Se puede revocar? Lo vigente y también un registro ajeno (el dueño del vault puede anular lo que cuelga de él,
// y por eso una credencial "no confirmada" con huella estándar es revocable). Lo ya revocado, no.
export function esRevocable(detalle) {
  return detalle?.estado === "valida" || detalle?.estado === "noConfirmada";
}

// Registro tipo terminal: los pasos reales de la verificación. Cada paso lleva tono "ok", "mal" o "pendiente".
// cuenta = clave pública de la institución (de la sesión), para mostrar qué cuenta firmó.
export function registroVerificacion(detalle, { cuenta } = {}) {
  const codigo = { etiqueta: "Código del documento", valor: huellaCorta(detalle.huella), tono: "ok", mono: true };
  const firmaOk = { etiqueta: "Firma de la institución", valor: `${cuentaCorta(cuenta)} · verificada`, tono: "ok", mono: true };
  switch (detalle.estado) {
    case "valida":
      return [codigo, { etiqueta: "Registro en la red", valor: "encontrado", tono: "ok" }, firmaOk, { etiqueta: "Estado", valor: "vigente", tono: "ok" }];
    case "revocada":
      return [codigo, { etiqueta: "Registro en la red", valor: "encontrado", tono: "ok" }, firmaOk, { etiqueta: "Estado", valor: "revocada", tono: "mal" }];
    case "noConfirmada":
      return [codigo, { etiqueta: "Registro en la red", valor: "encontrado", tono: "ok" }, { etiqueta: "Firma de la institución", valor: "no confirmada", tono: "mal" }];
    case "noEncontrada":
      return [codigo, { etiqueta: "Registro en la red", valor: "no encontrado", tono: "mal" }];
    default:
      return [codigo, { etiqueta: "Registro en la red", valor: detalle.motivo === "limite" ? "el registro no respondió (muchas consultas)" : "sin respuesta", tono: "pendiente" }];
  }
}
