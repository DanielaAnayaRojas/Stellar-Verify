import textos from "../content/textos.json";
import { formatearFecha } from "../services/formato.js";
import Sello from "./Sello.jsx";
import CampoCopiable from "./CampoCopiable.jsx";

// `verificacion.estado` es una de: valida, revocada, noEncontrada, emisorNoReconocido, noVerificable.
// Solo valida y revocada traen datos de la credencial; en los demás casos solo se muestra la huella consultada.
export default function ResultadoCredencial({ huella, verificacion, alReintentar }) {
  const campos = textos.resultados.campos;
  const { estado } = verificacion;
  const t = textos.resultados[estado];
  const confirmada = estado === "valida" || estado === "revocada";

  if (!confirmada) {
    return (
      <article className={`documento documento--${estado}`}>
        <header className="documento__cabecera">
          <h2>{t.titulo}</h2>
          <Sello estado={estado} />
        </header>
        <p>{estado === "noVerificable" && verificacion.motivo === "limite" ? t.explicacionLimite : t.explicacion}</p>
        {estado === "noVerificable" && alReintentar && (
          <button type="button" className="boton boton--secundario" onClick={alReintentar}>
            {t.reintentar}
          </button>
        )}
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

  const revocada = estado === "revocada";
  const explicacion =
    revocada && !verificacion.revocadaEl
      ? t.explicacionSinFecha
      : t.explicacion.replace("{fecha}", formatearFecha(verificacion.revocadaEl));

  return (
    <article className={`documento documento--${estado}`}>
      <header className="documento__cabecera">
        <h2>{verificacion.curso}</h2>
        <Sello estado={estado} />
      </header>
      <p className="documento__explicacion">{explicacion}</p>
      {revocada && <p>{t.significado}</p>}
      <dl className="documento__campos">
        <div className="documento__campo">
          <dt>{campos.institucion}</dt>
          <dd>{verificacion.institucion}</dd>
        </div>
        <div className="documento__campo">
          <dt>{campos.fechaEmision}</dt>
          <dd>{formatearFecha(verificacion.fecha)}</dd>
        </div>
        <CampoCopiable
          etiqueta={campos.huella}
          valor={huella}
          boton={textos.resultados.copiar}
          copiado={textos.resultados.copiada}
        />
      </dl>
    </article>
  );
}
