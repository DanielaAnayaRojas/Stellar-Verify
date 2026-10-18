// Lógica del panel institucional: validar los datos, preparar la evidencia y armar el enlace y el QR.
// La emisión en sí (preparar, firmar, enviar) vive en signingFlow.js.
// Los errores llevan un `codigo` que la pantalla traduce con textos.json.

import QRCode from "qrcode";
import { calcularHuella } from "./huella.js";
import { fetchPanelVerification } from "./verifyApi.js";

const MAX_CURSO = 120;
const CARACTERES_DE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const HASH_DE_TRANSACCION = /^[0-9a-f]{64}$/;

// Solo estos estados significan que ese archivo ya tiene un registro en la red.
const YA_REGISTRADO = new Set(["valida", "revocada", "emisorNoReconocido"]);

function esFechaReal(texto) {
  const partes = FECHA_ISO.exec(texto);
  if (!partes) return false;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// El servidor vuelve a validar todo: esto solo evita un viaje cuando el dato es evidentemente inválido.
export function validarDatos({ curso, fecha }) {
  const errores = {};
  const limpio = String(curso || "").trim();
  if (!limpio) errores.curso = "curso-vacio";
  else if (limpio.length > MAX_CURSO || CARACTERES_DE_CONTROL.test(limpio)) errores.curso = "curso-invalido";
  if (!esFechaReal(String(fecha || ""))) errores.fecha = "fecha-invalida";
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
  // Lectura fresca del panel: no deja "no encontrada" guardado en la caché de la verificación pública.
  const verificacion = await fetchPanelVerification(huella);
  return { huella, nombreArchivo: archivo.name, yaEmitida: YA_REGISTRADO.has(verificacion.estado) };
}

export function armarEnlace(huella, origen = window.location.origin) {
  return `${origen}/verificar/${huella}`;
}

export function enlaceTransaccion(txId) {
  return HASH_DE_TRANSACCION.test(String(txId)) ? `https://stellar.expert/explorer/testnet/tx/${txId}` : "";
}

export async function generarQR(texto) {
  const svg = await QRCode.toString(texto, {
    type: "svg",
    margin: 2,
    color: { dark: "#0E1A33", light: "#FFFFFF" },
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
