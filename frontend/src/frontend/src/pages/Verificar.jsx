import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import textos from "../content/textos.json";
import ZonaArchivo from "../components/ZonaArchivo.jsx";
import ResultadoCredencial from "../components/ResultadoCredencial.jsx";
import {
  prepararHuella,
  huellaDeEnlace,
  verificarArchivo,
  verificarHuella,
} from "../services/verificacion.js";

export default function Verificar() {
  const { huella: huellaEnRuta } = useParams();
  const navegar = useNavigate();
  const turno = useRef(0);

  const [fase, setFase] = useState("espera");
  const [resultado, setResultado] = useState(null);
  const [codigoError, setCodigoError] = useState("");
  const [campoHuella, setCampoHuella] = useState("");
  const [campoEnlace, setCampoEnlace] = useState("");

  const ejecutar = useCallback(async (trabajo) => {
    const mio = ++turno.current;
    setCodigoError("");
    setResultado(null);
    try {
      const nuevo = await trabajo((faseNueva) => {
        if (mio === turno.current) setFase(faseNueva);
      });
      if (mio !== turno.current) return;
      setResultado(nuevo);
      setFase("listo");
    } catch (fallo) {
      if (mio !== turno.current) return;
      setCodigoError(fallo.codigo || "archivo-ilegible");
      setFase("espera");
    }
  }, []);

  const reiniciar = useCallback(() => {
    turno.current += 1;
    setFase("espera");
    setResultado(null);
    setCodigoError("");
  }, []);

  useEffect(() => {
    if (!huellaEnRuta) {
      reiniciar();
      return;
    }
    ejecutar(async (cambiarFase) => {
      const huella = prepararHuella(huellaEnRuta, "enlace-invalido");
      return verificarHuella(huella, cambiarFase);
    });
  }, [huellaEnRuta, ejecutar, reiniciar]);

  function alElegirArchivo(archivo) {
    ejecutar((cambiarFase) => verificarArchivo(archivo, cambiarFase));
  }

  function alEnviarHuella(evento) {
    evento.preventDefault();
    try {
      navegar(`/verificar/${prepararHuella(campoHuella)}`);
    } catch (fallo) {
      setCodigoError(fallo.codigo);
    }
  }

  function alEnviarEnlace(evento) {
    evento.preventDefault();
    try {
      navegar(`/verificar/${huellaDeEnlace(campoEnlace)}`);
    } catch (fallo) {
      setCodigoError(fallo.codigo);
    }
  }

  function verOtro() {
    setCampoHuella("");
    setCampoEnlace("");
    if (huellaEnRuta) navegar("/");
    else reiniciar();
  }

  const cargando = fase === "calculando" || fase === "consultando";

  return (
    <section aria-labelledby="titulo-verificar">
      {fase === "espera" ? (
        <>
          <h1 id="titulo-verificar">{textos.home.titulo}</h1>
          <p>{textos.home.subtitulo}</p>
        </>
      ) : (
        <h1 id="titulo-verificar">{textos.verificar.tituloResultado}</h1>
      )}

      <div aria-live="polite" aria-atomic="true">
        {codigoError && (
          <p className="error" role="alert">
            {textos.errores[codigoError]}
          </p>
        )}
        {cargando && (
          <div className="carga">
            <div className="carga__barra" aria-hidden="true" />
            <p>
              {fase === "calculando"
                ? textos.verificar.calculando
                : textos.verificar.consultando}
            </p>
          </div>
        )}
        {fase === "listo" && resultado && (
          <ResultadoCredencial huella={resultado.huella} credencial={resultado.credencial} />
        )}
      </div>

      {fase === "espera" && (
        <>
          <ZonaArchivo alElegir={alElegirArchivo} />

          <h2 className="otras__titulo">{textos.verificar.otrasFormas}</h2>
          <form className="otra" onSubmit={alEnviarHuella} noValidate>
            <label htmlFor="campo-huella">{textos.verificar.huellaEtiqueta}</label>
            <p className="ayuda" id="ayuda-huella">
              {textos.verificar.huellaAyuda}
            </p>
            <div className="otra__fila">
              <input
                id="campo-huella"
                className="campo mono"
                type="text"
                autoComplete="off"
                spellCheck="false"
                aria-describedby="ayuda-huella"
                value={campoHuella}
                onChange={(evento) => setCampoHuella(evento.target.value)}
              />
              <button type="submit" className="boton boton--secundario">
                {textos.verificar.botonHuella}
              </button>
            </div>
          </form>

          <form className="otra" onSubmit={alEnviarEnlace} noValidate>
            <label htmlFor="campo-enlace">{textos.verificar.enlaceEtiqueta}</label>
            <p className="ayuda" id="ayuda-enlace">
              {textos.verificar.enlaceAyuda}
            </p>
            <div className="otra__fila">
              <input
                id="campo-enlace"
                className="campo"
                type="text"
                autoComplete="off"
                spellCheck="false"
                aria-describedby="ayuda-enlace"
                value={campoEnlace}
                onChange={(evento) => setCampoEnlace(evento.target.value)}
              />
              <button type="submit" className="boton boton--secundario">
                {textos.verificar.botonEnlace}
              </button>
            </div>
          </form>
        </>
      )}

      {fase === "listo" && (
        <button type="button" className="boton" onClick={verOtro}>
          {textos.verificar.otroDocumento}
        </button>
      )}
    </section>
  );
}
