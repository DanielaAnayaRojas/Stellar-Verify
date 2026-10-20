import { useState } from "react";
import textos from "../content/textos.json";

export default function ZonaArchivo({
  alElegir,
  titulo = textos.verificar.zonaTitulo,
  ayuda = textos.verificar.zonaAyuda,
  boton = textos.verificar.botonVerificar,
}) {
  const [encima, setEncima] = useState(false);

  function alSoltar(evento) {
    evento.preventDefault();
    setEncima(false);
    const archivo = evento.dataTransfer.files && evento.dataTransfer.files[0];
    if (archivo) alElegir(archivo);
  }

  function alCambiar(evento) {
    const archivo = evento.target.files && evento.target.files[0];
    evento.target.value = "";
    if (archivo) alElegir(archivo);
  }

  return (
    <label
      className={`zona${encima ? " zona--encima" : ""}`}
      onDragOver={(evento) => {
        evento.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={alSoltar}
    >
      <input className="solo-lectores zona__entrada" type="file" onChange={alCambiar} />
      <svg
        className="zona__icono"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" />
      </svg>
      <span className="zona__titulo">{titulo}</span>
      <span className="zona__ayuda">{ayuda}</span>
      <span className="boton" aria-hidden="true">
        {boton}
      </span>
    </label>
  );
}
