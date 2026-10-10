// Lógica del panel institucional: validar, preparar la evidencia y emitir.
// Los errores llevan un `codigo` que la pantalla traduce con textos.json.

import QRCode from "qrcode";
import { calcularHuella } from "./huella.js";
import { crearCredencial, obtenerCredencial } from "./credencialesService.js";

export function validarDatos(datos) {
  const errores = {};
  if (!datos.institucionId) errores.institucionId = "institucion-vacia";
  if (!datos.titular.trim()) errores.titular = "titular-vacio";
  if (!datos.logro.trim()) errores.logro = "logro-vacio";
  return errores;
}

export async function prepararEvidencia(archivo) {
  let huella;
  try {
    huella = await calcularHuella(archivo);
  } catch (fallo) {
    const codigo = fallo.codigo || "archivo-ilegible";
    const error = new Error(codigo);
    error.codigo = codigo;
    throw error;
  }
  const existente = await obtenerCredencial(huella);
  return { huella, nombreArchivo: archivo.name, yaEmitida: Boolean(existente) };
}

export function emitirCredencial(datos, evidencia) {
  return crearCredencial({
    institucionId: datos.institucionId,
    titular: datos.titular,
    logro: datos.logro,
    huella: evidencia.huella,
    nombreArchivo: evidencia.nombreArchivo,
  });
}

export function armarEnlace(huella, origen = window.location.origin) {
  return `${origen}/verificar/${huella}`;
}

export async function generarQR(texto) {
  const svg = await QRCode.toString(texto, {
    type: "svg",
    margin: 2,
    color: { dark: "#0E1A33", light: "#FFFFFF" },
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
