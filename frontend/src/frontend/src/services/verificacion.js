// Lógica de la verificación pública. La pantalla solo llama a estas funciones.
// Los errores llevan un `codigo` que la pantalla traduce con textos.json.

import { calcularHuella, normalizarHuella, esHuellaValida } from "./huella.js";
import { obtenerCredencial } from "./credencialesService.js";

function falla(codigo) {
  const error = new Error(codigo);
  error.codigo = codigo;
  return error;
}

export function prepararHuella(texto, codigo = "huella-invalida") {
  const huella = normalizarHuella(texto);
  if (!esHuellaValida(huella)) throw falla(codigo);
  return huella;
}

export function huellaDeEnlace(texto) {
  const coincidencia = String(texto || "").match(
    /\/verificar\/([0-9a-fA-F]{64})(?![0-9a-fA-F])/
  );
  if (coincidencia) return coincidencia[1].toLowerCase();
  return prepararHuella(texto, "enlace-invalido");
}

export async function verificarArchivo(archivo, alCambiarFase = () => {}) {
  alCambiarFase("calculando");
  let huella;
  try {
    huella = await calcularHuella(archivo);
  } catch (fallo) {
    throw fallo.codigo ? fallo : falla("archivo-ilegible");
  }
  alCambiarFase("consultando");
  return { huella, credencial: await obtenerCredencial(huella) };
}

export async function verificarHuella(huella, alCambiarFase = () => {}) {
  alCambiarFase("consultando");
  return { huella, credencial: await obtenerCredencial(huella) };
}
