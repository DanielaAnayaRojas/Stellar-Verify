// Lógica de la pantalla de detalle: el estado real de una credencial, con su enlace y su QR.
// Revocar se hace con signingFlow.js (firma de la institución en Freighter).

import { prepararHuella } from "./verificacion.js";
import { armarEnlace, generarQR } from "./emision.js";
import { fetchPanelVerification } from "./verifyApi.js";

export async function cargarDetalle(texto) {
  const huella = prepararHuella(texto, "no-existe");
  const verificacion = await fetchPanelVerification(huella);
  const enlace = armarEnlace(huella);

  // El QR solo tiene sentido para una credencial de la institución.
  let qr = "";
  if (verificacion.estado === "valida" || verificacion.estado === "revocada") {
    try {
      qr = await generarQR(enlace);
    } catch {
      qr = "";
    }
  }
  return { huella, verificacion, enlace, qr };
}

// Tras revocar, el estado se vuelve a leer, pero una lectura que falla o que aún dice otra cosa (dato viejo) no
// debe pisar lo que ya se sabe: se reintenta unas veces y, si no sale "revocada", devuelve null y la pantalla
// se queda con "revocada", que es lo confirmado.
export async function recargarTrasRevocar(huella, { cargar = cargarDetalle, intentos = 3, esperaMs = 2000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  for (let intento = 0; intento < intentos; intento += 1) {
    if (intento > 0) await sleep(esperaMs);
    try {
      const cargado = await cargar(huella);
      if (cargado.verificacion.estado === "revocada") return cargado;
    } catch {
      // Se reintenta.
    }
  }
  return null;
}

// Estado que ya se conoce con certeza (la revocación se confirmó) aplicado sobre el detalle en pantalla.
export function marcarRevocada(datos) {
  if (!datos) return datos;
  return { ...datos, verificacion: { ...datos.verificacion, estado: "revocada" } };
}
