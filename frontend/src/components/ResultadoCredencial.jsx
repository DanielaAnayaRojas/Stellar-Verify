import textos from "../content/textos.json";
import { formatearFecha } from "../services/formato.js";
import Sello from "./Sello.jsx";
import CampoCopiable from "./CampoCopiable.jsx";

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
          <CampoCopiable
            etiqueta={campos.huellaArchivo}
            valor={huella}
            boton={textos.resultados.copiar}
            copiado={textos.resultados.copiada}
          />
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
        <CampoCopiable
          etiqueta={campos.huella}
          valor={credencial.huella}
          boton={textos.resultados.copiar}
          copiado={textos.resultados.copiada}
        />
      </dl>
    </article>
  );
}
