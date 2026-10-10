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
      <input className="solo-lectores" type="file" onChange={alCambiar} />
      <span className="zona__titulo">{titulo}</span>
      <span className="zona__ayuda">{ayuda}</span>
      <span className="boton">{boton}</span>
    </label>
  );
}
