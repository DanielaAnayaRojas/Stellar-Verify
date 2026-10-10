// Capa de servicio simulada. Luego se reemplaza por el backend que llamará a ACTA (Testnet).
// La interfaz solo usa estas cuatro funciones:
//   crearCredencial(datos)    -> credencial
//   obtenerCredencial(huella) -> credencial | null
//   revocarCredencial(huella) -> credencial actualizada
//   listarCredenciales()      -> lista

import semilla from "../data/credenciales.json";
import { normalizarHuella, esHuellaValida } from "./huella.js";

const CLAVE_ALMACEN = "stellar-verify-demo-v1";
const RETRASO_MIN = 300;
const RETRASO_MAX = 800;

function esperar() {
  const ms = RETRASO_MIN + Math.random() * (RETRASO_MAX - RETRASO_MIN);
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function leerAlmacen() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    if (crudo) return JSON.parse(crudo);
  } catch {
    // Sin almacenamiento disponible: se trabaja con los datos de ejemplo.
  }
  return { credenciales: semilla.credenciales.map((c) => ({ ...c })) };
}

let estado = leerAlmacen();

function guardarAlmacen() {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento: los cambios duran mientras la pestaña siga abierta.
  }
}

function conInstitucion(credencial) {
  const institucion = semilla.instituciones.find((i) => i.id === credencial.institucionId);
  return { ...credencial, institucion: institucion || null };
}

export function listarInstituciones() {
  return semilla.instituciones.map((i) => ({ ...i }));
}

export async function listarCredenciales() {
  await esperar();
  return estado.credenciales.map(conInstitucion);
}

export async function obtenerCredencial(huella) {
  await esperar();
  const clave = normalizarHuella(huella);
  const encontrada = estado.credenciales.find((c) => c.huella === clave);
  return encontrada ? conInstitucion(encontrada) : null;
}

export async function crearCredencial(datos) {
  await esperar();
  const { huella, institucionId, titular, logro, nombreArchivo } = datos;
  if (!esHuellaValida(huella)) {
    throw new Error("Falta la huella del documento. Elige el archivo de evidencia.");
  }
  if (!titular || !titular.trim() || !logro || !logro.trim()) {
    throw new Error("Completa el titular y el logro antes de emitir.");
  }
  const clave = normalizarHuella(huella);
  if (estado.credenciales.some((c) => c.huella === clave)) {
    throw new Error("Este documento ya tiene una credencial emitida.");
  }
  const numero = String(estado.credenciales.length + 1).padStart(3, "0");
  const nueva = {
    huella: clave,
    institucionId,
    titular: titular.trim(),
    logro: logro.trim(),
    fechaEmision: new Date().toISOString().slice(0, 10),
    estado: "valida",
    evidenciaRef: `ref-${numero}`,
    nombreArchivo: nombreArchivo || null,
  };
  estado = { credenciales: [...estado.credenciales, nueva] };
  guardarAlmacen();
  return conInstitucion(nueva);
}

export async function revocarCredencial(huella) {
  await esperar();
  const clave = normalizarHuella(huella);
  const actual = estado.credenciales.find((c) => c.huella === clave);
  if (!actual) {
    throw new Error("No existe una credencial con esa huella.");
  }
  if (actual.estado === "revocada") {
    return conInstitucion(actual);
  }
  const actualizada = {
    ...actual,
    estado: "revocada",
    fechaRevocacion: new Date().toISOString().slice(0, 10),
  };
  estado = {
    credenciales: estado.credenciales.map((c) => (c.huella === clave ? actualizada : c)),
  };
  guardarAlmacen();
  return conInstitucion(actualizada);
}
