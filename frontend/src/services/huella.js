// Huella = SHA-256 del archivo, calculada en el navegador (Web Crypto).
// El archivo nunca se envía a ningún servidor.

const PATRON_HUELLA = /^[0-9a-f]{64}$/;

function aHexadecimal(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function calcularHuella(archivo) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error(
      "Este navegador no puede calcular la huella. Abre la página con https o desde localhost."
    );
  }
  const bytes = await archivo.arrayBuffer();
  const resumen = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return aHexadecimal(resumen);
}

export function normalizarHuella(texto) {
  return String(texto || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function esHuellaValida(texto) {
  return PATRON_HUELLA.test(normalizarHuella(texto));
}
