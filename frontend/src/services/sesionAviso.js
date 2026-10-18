// Aviso de que la sesión del panel está por terminar. La sesión dura 30 minutos desde la entrada y no se renueva.

export const AVISO_ANTES_MS = 5 * 60 * 1000;

// Milisegundos que faltan para mostrar el aviso. 0 si ya se está dentro de los últimos 5 minutos;
// null si la fecha no es válida o la sesión ya venció (entonces el aviso no tiene sentido).
export function msHastaAviso(expiresAt, ahora = Date.now(), antesMs = AVISO_ANTES_MS) {
  const fin = Date.parse(expiresAt);
  if (!Number.isFinite(fin) || fin <= ahora) return null;
  return Math.max(0, fin - antesMs - ahora);
}
