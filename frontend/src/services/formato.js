// Formato de fechas para mostrar en pantalla.
// La fecha llega como texto YYYY-MM-DD y se muestra partiendo el texto: nunca se pasa por Date,
// porque la zona horaria puede correrla un día.

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

// La fecha de hoy como texto YYYY-MM-DD en la hora LOCAL de la persona. No se usa toISOString(): da la fecha
// en UTC y, pasadas las 7 p. m. en Colombia, sale el día siguiente.
export function fechaLocalHoy(ahora = new Date()) {
  const dos = (numero) => String(numero).padStart(2, "0");
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

export function formatearFecha(iso) {
  if (!iso) return "";
  const partes = FECHA_ISO.exec(String(iso));
  if (!partes) return String(iso);
  const [, anio, mes, dia] = partes;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes || Number(dia) < 1 || Number(dia) > 31) return String(iso);
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}
