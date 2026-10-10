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
