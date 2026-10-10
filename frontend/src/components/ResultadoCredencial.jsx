import { useEffect, useRef, useState } from "react";
import textos from "../content/textos.json";
import { formatearFecha } from "../services/formato.js";
import Sello from "./Sello.jsx";

function Huella({ valor, etiqueta }) {
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
        <span className="mono huella">{valor}</span>
        <button type="button" className="boton boton--secundario" onClick={copiar}>
          {textos.resultados.copiar}
        </button>
        <span className="copia" role="status">
          {copia === "ok" && textos.resultados.copiada}
          {copia === "fallo" && textos.resultados.copiaFallida}
        </span>
      </dd>
    </div>
  );
}

export default function ResultadoCredencial({ huella, credencial }) {
  const campos = textos.resultados.campos;

  if (!credencial) {
    const t = textos.resultados.noEncontrada;
    return (
      <article className="documento documento--noEncontrada">
        <header className="documento__cabecera">
          <h2>{t.titulo}</h2>
          <Sello estado="noEncontrada" />
        </header>
        <p>{t.explicacion}</p>
        <dl className="documento__campos">
          <Huella valor={huella} etiqueta={campos.huellaArchivo} />
        </dl>
      </article>
    );
  }

  const revocada = credencial.estado === "revocada";
  const estado = revocada ? "revocada" : "valida";
  const t = textos.resultados[estado];
  const explicacion = t.explicacion.replace("{fecha}", formatearFecha(credencial.fechaRevocacion));

  return (
    <article className={`documento documento--${estado}`}>
      <header className="documento__cabecera">
        <h2>{credencial.logro}</h2>
        <Sello estado={estado} />
      </header>
      <p className="documento__explicacion">{explicacion}</p>
      {revocada && <p>{t.significado}</p>}
      <dl className="documento__campos">
        <div className="documento__campo">
          <dt>{campos.institucion}</dt>
          <dd>
            {credencial.institucion
              ? `${credencial.institucion.nombre}, ${credencial.institucion.pais}`
              : ""}
          </dd>
        </div>
        <div className="documento__campo">
          <dt>{campos.titular}</dt>
          <dd>{credencial.titular}</dd>
        </div>
        <div className="documento__campo">
          <dt>{campos.fechaEmision}</dt>
          <dd>{formatearFecha(credencial.fechaEmision)}</dd>
        </div>
        <Huella valor={credencial.huella} etiqueta={campos.huella} />
      </dl>
    </article>
  );
}
