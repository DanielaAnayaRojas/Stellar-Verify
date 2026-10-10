// Lógica de la pantalla de detalle: cargar una credencial con su enlace y QR, y revocarla.

import { obtenerCredencial, revocarCredencial } from "./credencialesService.js";
import { prepararHuella } from "./verificacion.js";
import { armarEnlace, generarQR } from "./emision.js";

export async function cargarDetalle(texto) {
  const huella = prepararHuella(texto, "no-existe");
  const credencial = await obtenerCredencial(huella);
  if (!credencial) {
    const error = new Error("no-existe");
    error.codigo = "no-existe";
    throw error;
  }
  const enlace = armarEnlace(credencial.huella);
  let qr = "";
  try {
    qr = await generarQR(enlace);
  } catch {
    qr = "";
  }
  return { credencial, enlace, qr };
}

export async function revocar(huella) {
  return revocarCredencial(huella);
}
