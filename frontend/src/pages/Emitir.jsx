import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../content/textos.json";
import Pasos from "../components/Pasos.jsx";
import ZonaArchivo from "../components/ZonaArchivo.jsx";
import CampoCopiable from "../components/CampoCopiable.jsx";
import IconoEstado from "../components/IconoEstado.jsx";
import { listarInstituciones } from "../services/credencialesService.js";
import {
  validarDatos,
  prepararEvidencia,
  emitirCredencial,
  armarEnlace,
  generarQR,
} from "../services/emision.js";

const TOTAL = textos.emision.pasos.length;

export default function Emitir() {
  const [instituciones] = useState(listarInstituciones);
  const vacio = { institucionId: instituciones[0] ? instituciones[0].id : "", titular: "", logro: "" };

  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [evidencia, setEvidencia] = useState(null);
  const [trabajo, setTrabajo] = useState("");
  const [error, setError] = useState("");
  const [autorizo, setAutorizo] = useState(false);
  const [creada, setCreada] = useState(null);
  const [qr, setQr] = useState("");
  const titulo = useRef(null);

  useEffect(() => {
    if (titulo.current) titulo.current.focus();
  }, [paso]);

  const institucion = instituciones.find((i) => i.id === datos.institucionId);
  const nombreInstitucion = institucion ? institucion.nombre : "";

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

  async function emitir() {
    if (!autorizo) {
      setError(textos.errores["autorizacion-faltante"]);
      return;
    }
    setError("");
    setTrabajo("emitiendo");
    try {
      const nueva = await emitirCredencial(datos, evidencia);
      let imagen = "";
      try {
        imagen = await generarQR(armarEnlace(nueva.huella));
      } catch {
        imagen = "";
      }
      setCreada(nueva);
      setQr(imagen);
      setPaso(5);
    } catch (fallo) {
      setError(fallo.message);
    }
    setTrabajo("");
  }

  function emitirOtra() {
    setDatos(vacio);
    setErrores({});
    setEvidencia(null);
    setAutorizo(false);
    setCreada(null);
    setQr("");
    setError("");
    setPaso(1);
  }

  const ocupado = trabajo !== "";

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
            <label htmlFor="institucion">{textos.formulario.emisor.etiqueta}</label>
            <p className="ayuda" id="ayuda-institucion">
              {textos.formulario.emisor.ayuda}
            </p>
            <select
              id="institucion"
              className="campo"
              value={datos.institucionId}
              aria-describedby="ayuda-institucion"
              aria-invalid={errores.institucionId ? "true" : undefined}
              onChange={(evento) => cambiar("institucionId", evento.target.value)}
            >
              {instituciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}, {i.pais}
                </option>
              ))}
            </select>
            {errores.institucionId && (
              <p className="error">{textos.errores[errores.institucionId]}</p>
            )}
          </div>

          <div className="grupo">
            <label htmlFor="titular">{textos.formulario.titular.etiqueta}</label>
            <p className="ayuda" id="ayuda-titular">
              {textos.formulario.titular.ayuda}
            </p>
            <input
              id="titular"
              className="campo"
              type="text"
              autoComplete="off"
              value={datos.titular}
              aria-describedby="ayuda-titular"
              aria-invalid={errores.titular ? "true" : undefined}
              onChange={(evento) => cambiar("titular", evento.target.value)}
            />
            {errores.titular && <p className="error">{textos.errores[errores.titular]}</p>}
          </div>

          <div className="grupo">
            <label htmlFor="logro">{textos.formulario.logro.etiqueta}</label>
            <p className="ayuda" id="ayuda-logro">
              {textos.formulario.logro.ayuda}
            </p>
            <input
              id="logro"
              className="campo"
              type="text"
              autoComplete="off"
              value={datos.logro}
              aria-describedby="ayuda-logro"
              aria-invalid={errores.logro ? "true" : undefined}
              onChange={(evento) => cambiar("logro", evento.target.value)}
            />
            {errores.logro && <p className="error">{textos.errores[errores.logro]}</p>}
          </div>

          <div className="acciones">
            <button type="submit" className="boton">
              {textos.emision.continuar}
            </button>
            <Link className="boton boton--secundario" to="/panel">
              {textos.emision.volverLista}
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
              <dd>{nombreInstitucion}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.titular}</dt>
              <dd>{datos.titular.trim()}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.logro}</dt>
              <dd>{datos.logro.trim()}</dd>
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
          <p>{textos.firma.texto}</p>

          <label className="casilla">
            <input
              type="checkbox"
              checked={autorizo}
              disabled={ocupado}
              onChange={(evento) => {
                setAutorizo(evento.target.checked);
                setError("");
              }}
            />
            <span>{textos.firma.casilla.replace("{institucion}", nombreInstitucion)}</span>
          </label>

          <div aria-live="polite" aria-atomic="true">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {trabajo === "emitiendo" && (
              <div className="carga">
                <div className="carga__barra" aria-hidden="true" />
                <p>{textos.firma.emitiendo}</p>
              </div>
            )}
          </div>

          <div className="acciones">
            <button type="button" className="boton" onClick={emitir} disabled={ocupado}>
              {textos.emision.botonEmitir}
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => ir(3)}
              disabled={ocupado}
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
              <dt>{textos.resultados.campos.titular}</dt>
              <dd>{creada.titular}</dd>
            </div>
            <div className="documento__campo">
              <dt>{textos.resultados.campos.logro}</dt>
              <dd>{creada.logro}</dd>
            </div>
            <CampoCopiable
              etiqueta={textos.resultados.campos.huella}
              valor={creada.huella}
              boton={textos.resultados.copiar}
              copiado={textos.resultados.copiada}
            />
            <CampoCopiable
              etiqueta={textos.emision.resultado.enlace}
              valor={armarEnlace(creada.huella)}
              boton={textos.emision.resultado.copiarEnlace}
              copiado={textos.emision.resultado.enlaceCopiado}
            />
          </dl>

          {qr && (
            <figure className="qr">
              <img
                src={qr}
                width="200"
                height="200"
                alt={textos.emision.resultado.qrAlt.replace("{titular}", creada.titular)}
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
              {textos.emision.volverLista}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
