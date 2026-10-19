import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import textos from "../content/textos.json";
import CampoCopiable from "../components/CampoCopiable.jsx";
import { Roseta } from "../components/Sello.jsx";
import FirmaEstado from "../components/FirmaEstado.jsx";
import { useSesionPanel } from "../components/PanelGate.jsx";
import { cargarDetalle, marcarRevocada, recargarTrasRevocar } from "../services/detalle.js";
import { olvidarMemoria } from "../services/lista.js";
import { enlaceTransaccion } from "../services/emision.js";
import { formatearFecha } from "../services/formato.js";
import { panelApi } from "../services/panelApi.js";
import { wallet } from "../services/freighter.js";
import { runSigning } from "../services/signingFlow.js";
import { initialSigningState, signingReducer } from "../services/signingMachine.js";

const ESTADOS_EN_CURSO = ["simulando", "esperando-firma", "enviando"];

export default function Detalle() {
  const { huella } = useParams();
  const { sesion, expirar } = useSesionPanel();
  const [datos, setDatos] = useState(null);
  const [codigoError, setCodigoError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [firma, despachar] = useReducer(signingReducer, initialSigningState);
  const cuadroConfirmacion = useRef(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setAviso("");
    setConfirmando(false);
    despachar({ type: "RESET" });
    cargarDetalle(huella)
      .then((cargado) => vigente && setDatos(cargado))
      .catch((error) => vigente && setCodigoError(error.codigo || "no-existe"));
    return () => {
      vigente = false;
    };
  }, [huella]);

  useEffect(() => {
    if (confirmando && cuadroConfirmacion.current) cuadroConfirmacion.current.focus();
  }, [confirmando]);

  useEffect(() => {
    if (firma.status === "error" && firma.error.kind === "unauthorized") expirar();
  }, [firma, expirar]);

  // Revocada la credencial: se vuelve a leer su estado real y se avisa.
  useEffect(() => {
    if (firma.status !== "confirmado") return;
    setConfirmando(false);
    setAviso(`${textos.revocacion.avisoRevocada}. ${textos.revocacion.avisoDetalle}`);
    // La revocación ya está confirmada: se muestra "revocada" de inmediato y se refresca con lo que lea el servidor.
    setDatos(marcarRevocada);
    olvidarMemoria();
    let vigente = true;
    recargarTrasRevocar(huella).then((cargado) => vigente && cargado && setDatos(cargado));
    return () => {
      vigente = false;
    };
  }, [firma, huella]);

  // Cada intento vuelve a preparar la revocación: nunca se reutiliza un XDR que pudo caducar.
  const revocar = useCallback(() => {
    runSigning({
      kind: "revoke",
      input: { huella },
      address: sesion.publicKey,
      dispatch: despachar,
      api: panelApi,
      wallet,
    });
  }, [huella, sesion]);

  // Flecha de regreso arriba de la pantalla, para no tener que bajar hasta el final.
  const volver = (
    <Link className="volver" to="/panel">
      <span aria-hidden="true">←</span> {textos.emision.volverPanel}
    </Link>
  );

  if (codigoError) {
    return (
      <section>
        {volver}
        <p className="error" role="alert">
          {textos.errores[codigoError]}
        </p>
        <Link className="boton" to="/panel">
          {textos.emision.volverPanel}
        </Link>
      </section>
    );
  }

  if (!datos) {
    return (
      <section>
        {volver}
        <div className="carga" role="status">
          <div className="carga__barra" aria-hidden="true" />
          <p>{textos.verificar.consultando}</p>
        </div>
      </section>
    );
  }

  const { verificacion, enlace, qr } = datos;
  const estado = verificacion.estado;
  const confirmada = estado === "valida" || estado === "revocada";
  const revocada = estado === "revocada";
  // Se puede revocar lo que está vigente, y también un registro ajeno (el dueño del vault puede anularlo).
  const revocable = estado === "valida" || estado === "emisorNoReconocido";
  const firmando = ESTADOS_EN_CURSO.includes(firma.status);
  const textosEstado = textos.resultados[estado];
  const txRevocacion = firma.status === "confirmado" ? enlaceTransaccion(firma.result.txId) : "";

  return (
    <section aria-labelledby="titulo-detalle">
      {volver}
      <h1 id="titulo-detalle">{confirmada ? verificacion.curso : textosEstado.titulo}</h1>
      <p className={`estado estado--${estado}`}>
        <Roseta tipo={estado} />
        {textosEstado.sello}
      </p>

      <div aria-live="polite" aria-atomic="true">
        {aviso && <p className="aviso">{aviso}</p>}
      </div>
      {txRevocacion && (
        <p>
          <a href={txRevocacion} target="_blank" rel="noreferrer">
            {textos.firma.verTransaccion}
          </a>
        </p>
      )}

      {!confirmada && <p>{textosEstado.explicacion}</p>}
      {revocada && (
        <p>
          {verificacion.revocadaEl
            ? textos.resultados.revocada.explicacion.replace("{fecha}", formatearFecha(verificacion.revocadaEl))
            : textos.resultados.revocada.explicacionSinFecha}
        </p>
      )}

      {confirmada && (
        <dl className="documento documento__campos documento__campos--solo">
          <div className="documento__campo">
            <dt>{textos.resultados.campos.institucion}</dt>
            <dd>{verificacion.institucion}</dd>
          </div>
          <div className="documento__campo">
            <dt>{textos.resultados.campos.fechaEmision}</dt>
            <dd>{formatearFecha(verificacion.fecha)}</dd>
          </div>
        </dl>
      )}

      {confirmada && (
        <div className="compartir">
          {qr && (
            <figure className="qr">
              <img
                src={qr}
                width="168"
                height="168"
                alt={textos.emision.resultado.qrAlt.replace("{curso}", verificacion.curso)}
              />
              <figcaption>{textos.emision.resultado.qr}</figcaption>
            </figure>
          )}
          <dl className="compartir__enlace">
            <CampoCopiable
              etiqueta={textos.emision.resultado.enlace}
              valor={enlace}
              boton={textos.emision.resultado.copiarEnlace}
              copiado={textos.emision.resultado.enlaceCopiado}
              mono={false}
            />
          </dl>
        </div>
      )}

      <details className="pliegue codigo-detalle">
        <summary>{textos.resultados.campos.huella}</summary>
        <dl>
          <CampoCopiable
            etiqueta={textos.resultados.campos.huella}
            valor={datos.huella}
            boton={textos.resultados.copiar}
            copiado={textos.resultados.copiada}
          />
        </dl>
      </details>

      {confirmando && revocable && (
        <div
          className="confirmacion"
          role="alertdialog"
          aria-labelledby="texto-confirmacion"
          tabIndex="-1"
          ref={cuadroConfirmacion}
        >
          <p id="texto-confirmacion">
            {estado === "valida"
              ? textos.revocacion.confirmacion.replace("{curso}", verificacion.curso)
              : textos.revocacion.confirmacionAjena}
          </p>
          <p>{textos.firma.explicacionRevocar}</p>

          <FirmaEstado estado={firma} alReintentar={revocar} />

          <div className="acciones">
            {(firma.status === "idle" || firma.status === "error") && (
              <button type="button" className="boton boton--peligro" onClick={revocar}>
                {textos.revocacion.botonRevocar}
              </button>
            )}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => {
                despachar({ type: "RESET" });
                setConfirmando(false);
              }}
              disabled={firmando}
            >
              {textos.revocacion.cancelar}
            </button>
          </div>
        </div>
      )}

      {!confirmando && (
        <div className="acciones">
          {revocable && (
            <button type="button" className="boton boton--peligro" onClick={() => setConfirmando(true)}>
              {textos.revocacion.botonRevocar}
            </button>
          )}
          {estado !== "noVerificable" && (
            <Link className={`boton${revocable ? " boton--secundario" : ""}`} to={`/verificar/${datos.huella}`}>
              {textos.emision.resultado.verVerificacion}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
