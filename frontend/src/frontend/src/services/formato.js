// Formato de fechas para mostrar en pantalla.

export function formatearFecha(iso) {
  if (!iso) return "";
  const fecha = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
