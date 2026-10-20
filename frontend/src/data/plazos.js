// Plazos de la sesión del panel. La sesión dura 30 minutos y no se renueva sola. El reloj del equipo puede
// estar adelantado o atrasado respecto al del servidor, así que estos plazos nunca cierran la sesión por sí
// solos: al vencer, la pantalla pregunta al servidor (GET /api/auth/session) y solo un "no autenticado" la cierra.
export const DURACION_SESION_MS = 30 * 60 * 1000;
export const AVISO_ANTES_MS = 5 * 60 * 1000;
export const REVISAR_CADA_MS = 60 * 1000;

// Milisegundos hasta preguntar al servidor si la sesión sigue: lo que falta según expiresAt, acotado a
// [0, 30 min] (setTimeout desborda por encima de 2^31-1 ms y un reloj adelantado daría negativos).
// Si según este reloj ya venció pero el servidor la confirmó, se vuelve a preguntar en un minuto.
export function msHastaRevisar(expiresAt, ahora = Date.now()) {
  const fin = Date.parse(expiresAt);
  if (!Number.isFinite(fin)) return REVISAR_CADA_MS;
  const falta = fin - ahora;
  if (falta <= 0) return REVISAR_CADA_MS;
  return Math.min(falta, DURACION_SESION_MS);
}

// Milisegundos hasta el aviso de "menos de 5 minutos", o null si no tiene sentido avisar: fecha inválida,
// ya vencida según este reloj (reloj desfasado) o un plazo mayor que una sesión (reloj atrasado).
export function msHastaAvisoFin(expiresAt, ahora = Date.now()) {
  const fin = Date.parse(expiresAt);
  if (!Number.isFinite(fin)) return null;
  const falta = fin - ahora;
  if (falta <= 0 || falta > DURACION_SESION_MS + REVISAR_CADA_MS) return null;
  return Math.max(0, falta - AVISO_ANTES_MS);
}
