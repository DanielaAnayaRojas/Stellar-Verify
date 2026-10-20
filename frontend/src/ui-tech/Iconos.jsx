// Íconos de la UI tech (trazos copiados del diseño). Decorativos: siempre aria-hidden.
const BASE = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" };

const TRAZOS = {
  resumen: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  credenciales: (
    <>
      <path d="M15 3H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z" />
      <path d="M15 3v4h4" />
      <path d="M3 8v11a2 2 0 0 0 2 2h9" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.4 3.2 8.4 7.5 9.5 4.3-1.1 7.5-5.1 7.5-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  instituciones: <path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M3 10l9-6 9 6z" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  abajo: <path d="m6 9 6 6 6-6" />,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  documento: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  revocada: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m9.5 12.5 5 5M14.5 12.5l-5 5" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.4v.1" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  salir: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  llave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 6l2.5 2.5M14 8l2 2" />
    </>
  ),
};

export default function Icono({ nombre, grosor = 1.8, ...resto }) {
  return (
    <svg {...BASE} strokeWidth={grosor} {...resto}>
      {TRAZOS[nombre]}
    </svg>
  );
}
