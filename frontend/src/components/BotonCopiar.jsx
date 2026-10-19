import { useEffect, useRef, useState } from "react";
import textos from "../content/textos.json";

// Botón que copia un texto al portapapeles y lo confirma con el mismo aviso que el resto de la aplicación.
export default function BotonCopiar({ valor, etiqueta = textos.resultados.copiar, copiado = textos.resultados.copiada }) {
  const [copia, setCopia] = useState("");
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopia("ok");
    } catch {
      setCopia("fallo");
    }
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopia(""), 3000);
  }

  return (
    <>
      <button type="button" className="boton boton--secundario" onClick={copiar}>
        {etiqueta}
      </button>
      <span className="copia" role="status">
        {copia === "ok" && copiado}
        {copia === "fallo" && textos.resultados.copiaFallida}
      </span>
    </>
  );
}
