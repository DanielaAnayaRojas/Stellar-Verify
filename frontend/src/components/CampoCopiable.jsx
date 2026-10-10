import { useEffect, useRef, useState } from "react";
import textos from "../content/textos.json";

export default function CampoCopiable({ etiqueta, valor, boton, copiado, mono = true }) {
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
    <div className="documento__campo documento__campo--huella">
      <dt>{etiqueta}</dt>
      <dd>
        <span className={`${mono ? "mono " : ""}huella`}>{valor}</span>
        <button type="button" className="boton boton--secundario" onClick={copiar}>
          {boton}
        </button>
        <span className="copia" role="status">
          {copia === "ok" && copiado}
          {copia === "fallo" && textos.resultados.copiaFallida}
        </span>
      </dd>
    </div>
  );
}
