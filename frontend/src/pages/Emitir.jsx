import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../content/textos.json";
import Pasos from "../components/Pasos.jsx";
import ZonaArchivo from "../components/ZonaArchivo.jsx";
import CampoCopiable from "../components/CampoCopiable.jsx";
import IconoEstado from "../components/IconoEstado.jsx";
import FirmaEstado from "../components/FirmaEstado.jsx";
import { useSesionPanel } from "../components/PanelGate.jsx";
import { validarDatos, prepararEvidencia, armarEnlace, enlaceTransaccion, generarQR } from "../services/emision.js";
import { fechaLocalHoy, formatearFecha } from "../services/formato.js";
import { panelApi } from "../services/panelApi.js";
import { wallet } from "../services/freighter.js";
import { runSigning } from "../services/signingFlow.js";
import { initialSigningState, signingReducer } from "../services/signingMachine.js";

const TOTAL = textos.emision.pasos.length;
const ESTADOS_EN_CURSO = ["simulando", "esperando-firma", "enviando"];

export default function Emitir() {
  const { sesion, expirar } = useSesionPanel();
  const vacio = () => ({ curso: "", fecha: fechaLocalHoy() });

  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [evidencia, setEvidencia] = useState(null);
  const [trabajo, setTrabajo] = useState("");
  const [error, setError] = useState("");
  const [creada, setCreada] = useState(null);
  const [qr, setQr] = useState("");
  const [firma, despachar] = useReducer(signingReducer, initialSigningState);
  const titulo = useRef(null);

  useEffect(() => {
    if (titulo.current) titulo.current.focus();
  }, [paso]);

  // Sesión vencida a mitad de la emisión: vuelve a la pantalla de entrada.
  useEffect(() => {
    if (firma.status === "error" && firma.error.kind === "unauthorized") expirar();
  }, [firma, expirar]);

  // Confirmada la emisión: se muestra el resultado con su enlace y su código QR.
  useEffect(() => {
    if (firma.status !== "confirmado" || !evidencia) return;
    const enlace = armarEnlace(evidencia.huella);
    setCreada({
      huella: evidencia.huella,
      curso: datos.curso.trim(),
      fecha: datos.fecha,
      txId: firma.result.txId,
      enlace,
    });
    generarQR(enlace)
      .then(setQr)
      .catch(() => setQr(""));
    setPaso(5);
  }, [firma, evidencia, datos]);

  function cambiar(campo, valor) {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function ir(nuevoPaso) {
    setError("");
    setPaso(nuevoPaso);
  }

  function enviarDatos(evento) {
    evento.preventDefault();
    const encontrados = validarDatos(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length === 0) ir(2);
  }

  async function elegirArchivo(archivo) {
    setError("");
    setEvidencia(null);
    setTrabajo("calculando");
    try {
      const preparada = await prepararEvidencia(archivo);
      if (preparada.yaEmitida) setError(textos.errores["ya-emitida"]);
      else setEvidencia(preparada);
    } catch (fallo) {
      setError(textos.errores[fallo.codigo] || textos.errores["archivo-ilegible"]);
    }
    setTrabajo("");
  }

  // Cada intento vuelve a preparar la operación: nunca se reutiliza un XDR que pudo caducar.
  const emitir = useCallback(() => {
    runSigning({
      kind: "issue",
      input: { huella: evidencia.huella, course: datos.curso.trim(), issueDate: datos.fecha },
      address: sesion.publicKey,
      dispatch: despachar,
      api: panelApi,
      wallet,
    });
  }, [evidencia, datos, sesion]);

  function emitirOtra() {
    despachar({ type: "RESET" });
    setDatos(vacio());
    setErrores({});
    setEvidencia(null);
    setCreada(null);
    setQr("");
    setError("");
    setPaso(1);
  }

  const ocupado = trabajo !== "";
  const firmando = ESTADOS_EN_CURSO.includes(firma.status);
  const enlaceDeTransaccion = creada ? enlaceTransaccion(creada.txId) : "";

  return (
    <section aria-labelledby="titulo-paso">
      <Pasos actual={paso} />
      <p className="paso-de">
        {textos.emision.pasoDe.replace("{n}", paso).replace("{total}", TOTAL)}
      </p>

      {paso === 1 && (
        <form onSubmit={enviarDatos} noValidate>
          <h1 id="titulo-paso" tabIndex="-1" ref={titulo}>
            {textos.emision.datos.titulo}
          </h1>

          <div className="grupo">
            <p className="grupo__etiqueta">{textos.formulario.emisor.etiqueta}</p>
            <p className="ayuda">{textos.formulario.emisor.ayuda}</p>
            <p>
              <strong>{sesion.institutionName}</strong>
            </p>
          </div>

          <div className="grupo">
            <label htmlFor="curso">{textos.formulario.curso.etiqueta}</label>
            <p className="ayuda" id="ayuda-curso">
              {textos.formulario.curso.ayuda}
            </p>
            <input
              id="curso"
              className="campo"
              type="text"
              autoComplete="off"
              maxLength={120}
              value={datos.curso}
              aria-describedby="ayuda-curso"
              aria-invalid={errores.curso ? "true" : undefined}
              onChange={(evento) => cambiar("curso", evento.target.value)}
            />
            {errores.curso && <p className="error">{textos.errores[errores.curso]}</p>}
          </div>

          <div className="grupo">
            <label htmlFor="fecha">{textos.formulario.fecha.etiqueta}</label>
            <p className="ayuda" id="ayuda-fecha">
              {textos.formulario.fecha.ayuda}
            </p>
            <input
              id="fecha"
              className="campo"
              type="date"
              min="2000-01-01"
              value={datos.fecha}
              aria-describedby="ayuda-fecha"
              aria-invalid={errores.fecha ? "true" : undefined}
              onChange={(evento) => cambiar("fecha", evento.target.value)}
            />
            {errores.fecha && <p className="error">{textos.errores[errores.fecha]}</p>}
          </div>

          <div className="acciones">
            <button type="submit" className="boton">
              {textos.emision.continuar}
            </button>
            <Link className="boton boton--secundario" to="/panel">
              {textos.emision.volverPanel}
            </Link>
          </div>
        </form>
      )}

      {paso === 2 && (
        <div>
          <h1 id="titulo-paso" tabIndex="-1" ref={titulo}>
            {textos.emision.evidencia.titulo}
          </h1>
          <p>{textos.formulario.evidencia.ayuda}</p>

          <div aria-live="polite" aria-atomic="true">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {trabajo === "calculando" && (
              <div className="carga">
                <div className="carga__barra" aria-hidden="true" />
                <p>{textos.verificar.calculando}</p>
              </div>
            )}
          </div>

          {!evidencia && !ocupado && (
            <ZonaArchivo
              alElegir={elegirArchivo}
              titulo={textos.emision.evidencia.zonaTitulo}
              ayuda={textos.emision.evidencia.zonaAyuda}
              boton={textos.emision.evidencia.boton}
            />
          )}

          {evidencia && (
            <>
              <dl className="documento documento__campos documento__campos--solo">
                <div className="documento__campo">
                  <dt>{textos.emision.evidencia.elegido}</dt>
                  <dd>{evidencia.nombreArchivo}</dd>
                </div>
                <div className="documento__campo">
                  <dt>{textos.emision.evidencia.huella}</dt>
                  <dd className="mono">{evidencia.huella}</dd>
                </div>
              </dl>
              <div className="acciones">
                <button type="button" className="boton" onClick={() => ir(3)}>
                  {textos.emision.continuar}
                </button>
                <button
                  type="button"
                  className="boton boton--secundario"
                  onClick={() => setEvidencia(null)}
                >
                  {textos.emision.evidencia.cambiar}
                </button>
              </div>
            </>
          )}

          {!evidencia && !ocupado && (
            <div className="acciones">
              <button type="button" className="boton boton--secundario" onClick={() => ir(1)}>
                {textos.emision.volver}
              </button>
            </div>
          )}
        </div>
      )}

      {paso === 3 && evidencia && (
        <div>
          <h1 id="titulo-paso" tabIndex="-1" ref={titulo}>
            {textos.emision.revision.titulo}
          </h1>
          <p>{textos.emision.revision.ayuda}</p>
          <dl className="documento documento__campos documento__campos--solo">
            <div className="documento__campo">
              <dt>{textos.resultados.campos.institucion}</dt>
              <dd>{sesion.institutionName}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.curso}</dt>
              <dd>{datos.curso.trim()}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.fechaEmision}</dt>
              <dd>{formatearFecha(datos.fecha)}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.emision.revision.archivo}</dt>
              <dd>{evidencia.nombreArchivo}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.huella}</dt>
              <dd className="mono">{evidencia.huella}</dd>
            </div>
          </dl>
          <div className="acciones">
            <button type="button" className="boton" onClick={() => ir(4)}>
              {textos.emision.continuar}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => ir(2)}>
              {textos.emision.volver}
            </button>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div>
          <h1 id="titulo-paso" tabIndex="-1" ref={titulo}>
            {textos.firma.titulo}
          </h1>
          <p>{textos.firma.explicacion}</p>

          <FirmaEstado estado={firma} alReintentar={emitir} />

          <div className="acciones">
            {firma.status === "idle" && (
              <button type="button" className="boton" onClick={emitir}>
                {textos.firma.botonEmitir}
              </button>
            )}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => {
                despachar({ type: "RESET" });
                ir(3);
              }}
              disabled={firmando}
            >
              {textos.emision.volver}
            </button>
          </div>
        </div>
      )}

      {paso === 5 && creada && (
        <div>
          <h1 id="titulo-paso" tabIndex="-1" ref={titulo} className="aviso-emitida">
            <IconoEstado estado="valida" tamano={32} />
            {textos.emision.avisoEmitida}
          </h1>
          <p>{textos.emision.resultado.ayuda}</p>

          <dl className="documento documento__campos documento__campos--solo">
            <div className="documento__campo">
              <dt>{textos.resultados.campos.curso}</dt>
              <dd>{creada.curso}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.fechaEmision}</dt>
              <dd>{formatearFecha(creada.fecha)}</dd>
            </div>
            <CampoCopiable
              etiqueta={textos.resultados.campos.huella}
              valor={creada.huella}
              boton={textos.resultados.copiar}
              copiado={textos.resultados.copiada}
            />
            <CampoCopiable
              etiqueta={textos.emision.resultado.enlace}
              valor={creada.enlace}
              boton={textos.emision.resultado.copiarEnlace}
              copiado={textos.emision.resultado.enlaceCopiado}
            />
            {enlaceDeTransaccion && (
              <div className="documento__campo">
                <dt>{textos.emision.resultado.transaccion}</dt>
                <dd>
                  <a href={enlaceDeTransaccion} target="_blank" rel="noreferrer">
                    {textos.emision.resultado.verTransaccion}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {qr && (
            <figure className="qr">
              <img
                src={qr}
                width="200"
                height="200"
                alt={textos.emision.resultado.qrAlt.replace("{curso}", creada.curso)}
              />
              <figcaption>{textos.emision.resultado.qr}</figcaption>
            </figure>
          )}

          <div className="acciones">
            <Link className="boton" to={`/verificar/${creada.huella}`}>
              {textos.emision.resultado.verVerificacion}
            </Link>
            <button type="button" className="boton boton--secundario" onClick={emitirOtra}>
              {textos.emision.resultado.otra}
            </button>
            <Link className="boton boton--secundario" to="/panel">
              {textos.emision.volverPanel}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
