import textos from "../content/textos.json";
import { formatearFecha } from "../services/formato.js";
import Sello from "./Sello.jsx";
import BotonCopiar from "./BotonCopiar.jsx";

// `verificacion.estado` es una de: valida, revocada, noEncontrada, emisorNoReconocido, noVerificable.
// Solo valida y revocada traen datos de la credencial. El código del documento y el enlace al registro
// público quedan plegados en "Comprobarlo por tu cuenta": están para quien quiera revisar, no estorban al resto.
function Comprobar({ huella, etiqueta, conRegistro }) {
  const t = textos.resultados.comprobar;
  return (
    <details className="pliegue">
      <summary>{t.titulo}</summary>
      <div className="pliegue__cuerpo">
        <p>{t.texto}</p>
        <p className="pliegue__etiqueta">{etiqueta}</p>
        <p className="mono pliegue__codigo">{huella}</p>
        <div className="acciones acciones--juntas">
          <BotonCopiar valor={huella} />
          {conRegistro && (
            <a className="boton boton--secundario" href={t.registroUrl} target="_blank" rel="noreferrer">
              {t.registro}
              <span className="solo-lectores"> (se abre en otra pestaña)</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </details>
  );
}

export default function ResultadoCredencial({ huella, verificacion, alReintentar, porEnlace = false }) {
  const campos = textos.resultados.campos;
  const { estado } = verificacion;
  const t = textos.resultados[estado];
  const confirmada = estado === "valida" || estado === "revocada";

  if (!confirmada) {
    return (
      <article className={`documento documento--${estado}`} aria-labelledby="titulo-resultado">
        <header className="documento__cabecera">
          <Sello estado={estado} />
          <h2 id="titulo-resultado" className="documento__veredicto" tabIndex="-1">
            {t.titulo}
          </h2>
        </header>
        <p className="documento__explicacion">{estado === "noVerificable" && verificacion.motivo === "limite" ? t.explicacionLimite : t.explicacion}</p>
        {estado === "noVerificable" && alReintentar && (
          <div className="acciones">
            <button type="button" className="boton" onClick={alReintentar}>
              {t.reintentar}
            </button>
          </div>
        )}
        <Comprobar huella={huella} etiqueta={campos.huellaArchivo} conRegistro={false} />
      </article>
    );
  }

  const revocada = estado === "revocada";
  const plantilla = revocada && !verificacion.revocadaEl ? t.explicacionSinFecha : t.explicacion;
  const explicacion = plantilla
    .replace("{institucion}", verificacion.institucion)
    .replace("{fecha}", formatearFecha(verificacion.revocadaEl));

  return (
    <article className={`documento documento--${estado}`} aria-labelledby="titulo-resultado">
      <header className="documento__cabecera">
        <Sello estado={estado} />
        <h2 id="titulo-resultado" className="documento__veredicto" tabIndex="-1">
          {t.titulo}
        </h2>
      </header>
      <p className="documento__explicacion">{explicacion}</p>

      <div className="documento__credencial">
        <p className="documento__etiqueta">{campos.curso}</p>
        <p className="documento__curso">{verificacion.curso}</p>
        <dl className="documento__campos">
          <div className="documento__campo">
            <dt>{campos.institucion}</dt>
            <dd>{verificacion.institucion}</dd>
          </div>
          <div className="documento__campo">
            <dt>{campos.fechaEmision}</dt>
            <dd>{formatearFecha(verificacion.fecha)}</dd>
          </div>
        </dl>
      </div>

      {/* Qué prueba y qué no: por enlace o QR no se comparó ningún archivo; con archivo, se confirma el documento, no a quien lo presenta. */}
      {estado === "valida" && (
        <p className="documento__alcance">{porEnlace ? textos.resultados.porEnlace : t.alcance}</p>
      )}

      <Comprobar huella={huella} etiqueta={campos.huella} conRegistro />
    </article>
  );
}
