// Roseta de Stellar-Verify: un anillo con 24 dientes y un signo en el centro. La misma forma es la marca
// (con anillo interior) y el sello de cada estado. El dorado se reserva para lo realmente sellado: la marca
// y las credenciales válidas.
const DIENTES = Array.from({ length: 24 }, (_, i) => {
  const angulo = (i / 24) * Math.PI * 2;
  const punto = (radio) => [12 + Math.cos(angulo) * radio, 12 + Math.sin(angulo) * radio].map((n) => n.toFixed(2));
  const [x1, y1] = punto(8.4);
  const [x2, y2] = punto(10.5);
  return { x1, y1, x2, y2 };
});

const CENTROS = {
  marca: <circle cx="12" cy="12" r="5.8" strokeWidth="1" />,
  valida: (
    <>
      <circle cx="12" cy="12" r="5.8" strokeWidth="1" />
      <path d="m9.4 12 1.8 1.8 3.4-3.6" strokeWidth="1.3" />
    </>
  ),
  revocada: (
    <>
      <circle cx="12" cy="12" r="5.8" strokeWidth="1" />
      <path d="M9.6 14.4l4.8-4.8" strokeWidth="1.3" />
    </>
  ),
  emisorNoReconocido: (
    <>
      <path d="M12 7.6l4.4 7.6H7.6z" strokeWidth="1" />
      <path d="M12 10.6v2.1M12 14v.1" strokeWidth="1.2" />
    </>
  ),
  noEncontrada: <circle cx="12" cy="12" r="5.5" strokeWidth="1.1" strokeDasharray="2.4 2.4" />,
  noVerificable: (
    <>
      <path d="M8.6 12a3.4 3.4 0 0 1 5.9-2.3M15.4 12a3.4 3.4 0 0 1-5.9 2.3" strokeWidth="1.1" />
      <path d="M14.6 8.2v1.6h-1.6M9.4 15.8v-1.6h1.6" strokeWidth="1.1" />
    </>
  ),
};

export function Roseta({ tipo = "marca", className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10.5" strokeWidth="1" />
      {DIENTES.map((d, i) => (
        <line key={i} {...d} strokeWidth="0.9" />
      ))}
      {CENTROS[tipo] || CENTROS.marca}
    </svg>
  );
}

export default function Sello({ estado }) {
  return (
    <div className={`sello sello--${estado}`}>
      <Roseta tipo={estado} className="sello__icono" />
    </div>
  );
}
