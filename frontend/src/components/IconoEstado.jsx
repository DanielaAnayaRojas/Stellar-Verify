const ICONOS = {
  valida: <path d="M6 12.5l4 4 8-9" />,
  revocada: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 17.5l11-11" />
    </>
  ),
  noEncontrada: (
    <>
      <path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1" />
      <path d="M12 17.5v.1" />
    </>
  ),
  // Triángulo de aviso: hay un registro, pero no lo emitió la institución.
  emisorNoReconocido: (
    <>
      <path d="M12 4.5l8.5 15h-17z" />
      <path d="M12 10.5v4" />
      <path d="M12 17.2v.1" />
    </>
  ),
  // Flechas circulares: no se pudo comprobar, se puede intentar de nuevo.
  noVerificable: (
    <>
      <path d="M5.5 12a6.5 6.5 0 0 1 11.2-4.5" />
      <path d="M17.5 4.5v3.2h-3.2" />
      <path d="M18.5 12a6.5 6.5 0 0 1-11.2 4.5" />
      <path d="M6.5 19.5v-3.2h3.2" />
    </>
  ),
};

export default function IconoEstado({ estado, tamano = 28, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[estado]}
    </svg>
  );
}
