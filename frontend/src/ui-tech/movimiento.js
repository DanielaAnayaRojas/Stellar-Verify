// Movimiento de la UI tech: funciones puras (probadas con node:test) y morph() para las View Transitions.
// Con prefers-reduced-motion todo se reduce a fundidos y no hay View Transitions (ver estilos/base.css).
import { flushSync } from "react-dom";

export function prefiereReducir(win = globalThis.window) {
  return Boolean(win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

// Envuelve un cambio de estado en una View Transition. flushSync hace que React pinte el estado nuevo
// dentro del callback, que es cuando el navegador toma la "foto" de llegada.
// dir: "fwd" | "back" se publica en <html data-vtdir> para que el CSS elija la dirección (pasos del formulario).
export function morph(actualizar, { dir = null, doc = globalThis.document, win = globalThis.window } = {}) {
  if (!doc?.startViewTransition || prefiereReducir(win)) {
    actualizar();
    return null;
  }
  if (dir) doc.documentElement.dataset.vtdir = dir;
  const transicion = doc.startViewTransition(() => flushSync(actualizar));
  if (dir) transicion.finished.finally(() => delete doc.documentElement.dataset.vtdir);
  return transicion;
}

// Curva de los conteos: ease-out cuártica, como en el diseño.
export function easeOutQuart(k) {
  const t = Math.min(1, Math.max(0, k));
  return 1 - (1 - t) ** 4;
}

// Valor de un conteo en el instante t (ms desde que empezó la animación).
export function valorConteo(destino, t, { duracion = 1100, retraso = 180 } = {}) {
  if (!Number.isFinite(destino)) return 0;
  if (duracion <= 0) return destino;
  return destino * easeOutQuart((t - retraso) / duracion);
}

// Inclinación 3D de un certificado según el puntero dentro de su caja (diseño: 12° en Y, 10° en X).
// Devuelve grados y la posición del reflejo en porcentaje.
export function inclinacion(clienteX, clienteY, caja) {
  if (!caja || caja.width <= 0 || caja.height <= 0) return { rx: 0, ry: 0, mx: 50, my: 30 };
  const x = Math.min(1, Math.max(0, (clienteX - caja.left) / caja.width));
  const y = Math.min(1, Math.max(0, (clienteY - caja.top) / caja.height));
  return { ry: (x - 0.5) * 12, rx: (0.5 - y) * 10, mx: x * 100, my: y * 100 };
}

// Formato de cifras del panel (es-CO: 1.248).
export function cifra(n) {
  return Math.round(n).toLocaleString("es-CO");
}
