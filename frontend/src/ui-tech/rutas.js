// Rutas que ya pinta el panel tech. Las demás rutas de /panel siguen con las pantallas anteriores
// hasta que se migren (una por fase), para que el panel funcione completo en cada paso.
export const RUTAS_TECH = Object.freeze({
  resumen: "/panel",
});

// Rutas de concepto (datos ficticios). Solo existen con VITE_CONCEPTO=1.
export const RUTAS_CONCEPTO = Object.freeze({});

export function esRutaTech(pathname, { concepto = false } = {}) {
  // React Router no distingue mayúsculas (/Panel abre /panel): aquí tampoco.
  const ruta = String(pathname ?? "").toLowerCase().replace(/\/+$/, "") || "/";
  if (Object.values(RUTAS_TECH).includes(ruta)) return true;
  return concepto && Object.values(RUTAS_CONCEPTO).includes(ruta);
}
