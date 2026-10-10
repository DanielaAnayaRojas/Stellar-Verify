import textos from "../content/textos.json";
import IconoEstado from "./IconoEstado.jsx";

export default function Sello({ estado }) {
  const etiqueta = textos.resultados[estado].sello;
  return (
    <div
      className={`sello sello--${estado}`}
      role="img"
      aria-label={`Sello: ${etiqueta}`}
    >
      <IconoEstado estado={estado} className="sello__icono" />
      <span className="sello__texto">{etiqueta}</span>
    </div>
  );
}
