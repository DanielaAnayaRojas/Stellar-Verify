import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import textos from "../content/textos.json";
import ZonaArchivo from "../components/ZonaArchivo.jsx";
import ResultadoCredencial from "../components/ResultadoCredencial.jsx";
import { prepararHuella, huellaDeEnlace, verificarArchivo, verificarHuella } from "../services/verificacion.js";

// Pasado este tiempo consultando, se avisa que la consulta puede tardar.
const AVISO_LENTO_MS = 4000;

export default function Verificar() {
  const { huella: huellaEnRuta } = useParams();
  const navegar = useNavigate();
  const turno = useRef(0);
  const ultimoTrabajo = useRef(null);
  const volverAPortada = useRef(false);

  const [fase, setFase] = useState("espera");
  const [resultado, setResultado] = useState(null);
  const [codigoError, setCodigoError] = useState("");
  const [campoCodigo, setCampoCodigo] = useState("");
  const [lento, setLento] = useState(false);

  const ejecutar = useCallback(async (trabajo) => {
    const mio = ++turno.current;
    ultimoTrabajo.current = trabajo;
    setCodigoError("");
    setResultado(null);
    const cambiarFase = (faseNueva) => {
      if (mio === turno.current) setFase(faseNueva);
    };
    try {
      // Sin reintentos automáticos: ACTA limita las consultas por minuto de todo el proyecto, y repetir gasta cuota.
      const nuevo = await trabajo(cambiarFase);
      if (mio !== turno.current) return;
      setResultado(nuevo);
      setFase("listo");
    } catch (fallo) {
      if (mio !== turno.current) return;
      setCodigoError(fallo.codigo || "archivo-ilegible");
      setFase("espera");
    }
  }, []);

  // Repite la última consulta (por ejemplo, tras "No pudimos comprobarlo") sin volver a elegir el archivo.
  const reintentar = useCallback(() => {
    if (ultimoTrabajo.current) ejecutar(ultimoTrabajo.current);
  }, [ejecutar]);

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

  useEffect(() => {
    setLento(false);
    if (fase !== "consultando") return undefined;
    const temporizador = setTimeout(() => setLento(true), AVISO_LENTO_MS);
    return () => clearTimeout(temporizador);
  }, [fase]);

  // El control que se usó (archivo, ejemplo, campo) desaparece al consultar: el foco iría al cuerpo de la página.
  // Al llegar el resultado se lleva al veredicto, para teclado y lectores de pantalla.
  useEffect(() => {
    if (fase !== "listo") return;
    const activo = document.activeElement;
    if (activo && activo !== document.body) return;
    const veredicto = document.getElementById("titulo-resultado");
    if (veredicto) veredicto.focus();
  }, [fase]);

  // "Verificar otro documento" desaparece al volver: el foco pasa al título de la portada.
  useEffect(() => {
    if (fase !== "espera" || !volverAPortada.current) return;
    volverAPortada.current = false;
    const titulo = document.getElementById("titulo-verificar");
    if (titulo) titulo.focus();
  }, [fase, huellaEnRuta]);

  function alElegirArchivo(archivo) {
    ejecutar((cambiarFase) => verificarArchivo(archivo, cambiarFase));
  }

  // Los ejemplos pasan por el mismo camino que un archivo real: se descarga, se lee en el navegador y se consulta.
  async function probarEjemplo(ejemplo) {
    const mio = ++turno.current;
    setCodigoError("");
    setResultado(null);
    setFase("calculando");
    let archivo;
    try {
      const respuesta = await fetch(ejemplo.archivo, { cache: "no-store" });
      if (!respuesta.ok) throw new Error("sin ejemplo");
      archivo = new File([await respuesta.blob()], ejemplo.nombre, { type: "text/plain" });
    } catch {
      if (mio !== turno.current) return;
      setCodigoError("ejemplo-fallido");
      setFase("espera");
      return;
    }
    // Si mientras se descargaba se eligió otro ejemplo o archivo, este ya no cuenta.
    if (mio !== turno.current) return;
    alElegirArchivo(archivo);
  }

  // Un solo campo: acepta el enlace de verificación o el código suelto.
  function alEnviarCodigo(evento) {
    evento.preventDefault();
    try {
      navegar(`/verificar/${huellaDeEnlace(campoCodigo)}`);
    } catch (fallo) {
      setCodigoError(fallo.codigo || "enlace-invalido");
    }
  }

  function verOtro() {
    volverAPortada.current = true;
    setCampoCodigo("");
    if (huellaEnRuta) navegar("/");
    else reiniciar();
  }

  const cargando = fase === "calculando" || fase === "consultando";
  const errorDeCampo = codigoError === "enlace-invalido" || codigoError === "huella-invalida";

  return (
    <section aria-labelledby="titulo-verificar" className="verificar">
      {fase === "espera" ? (
        <header className="portada">
          <h1 id="titulo-verificar" tabIndex="-1">
            {textos.home.titulo}
          </h1>
          <p className="portada__sub">{textos.home.subtitulo}</p>
        </header>
      ) : (
        <h1 id="titulo-verificar" className="solo-lectores">
          {textos.verificar.tituloResultado}
        </h1>
      )}

      <div aria-live="polite" aria-atomic="true">
        {codigoError && !errorDeCampo && (
          <p className="error" role="alert">
            {textos.errores[codigoError]}
          </p>
        )}
        {cargando && (
          <div className="documento documento--cargando">
            <div className="carga">
              <div className="carga__barra" aria-hidden="true" />
              <p>{fase === "calculando" ? textos.verificar.calculando : textos.verificar.consultando}</p>
            </div>
            {lento && <p className="ayuda">{textos.verificar.consultandoLento}</p>}
          </div>
        )}
        {fase === "listo" && resultado && (
          <ResultadoCredencial
            huella={resultado.huella}
            verificacion={resultado.verificacion}
            alReintentar={reintentar}
            porEnlace={Boolean(huellaEnRuta)}
          />
        )}
      </div>

      {fase === "espera" && (
        <>
          <ZonaArchivo alElegir={alElegirArchivo} />

          <form className="codigo" onSubmit={alEnviarCodigo} noValidate>
            <label htmlFor="campo-codigo">{textos.verificar.codigoEtiqueta}</label>
            <p className="ayuda" id="ayuda-codigo">
              {textos.verificar.codigoAyuda}
            </p>
            <div className="codigo__fila">
              <input
                id="campo-codigo"
                className="campo"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck="false"
                placeholder="https://stellar-verify.vercel.app/verificar/…"
                aria-describedby={errorDeCampo ? "ayuda-codigo error-codigo" : "ayuda-codigo"}
                aria-invalid={errorDeCampo ? "true" : undefined}
                value={campoCodigo}
                onChange={(evento) => {
                  setCampoCodigo(evento.target.value);
                  if (errorDeCampo) setCodigoError("");
                }}
              />
              <button type="submit" className="boton boton--secundario">
                {textos.verificar.codigoBoton}
              </button>
            </div>
            {errorDeCampo && (
              <p className="error" id="error-codigo" role="alert">
                {textos.errores[codigoError]}
              </p>
            )}
          </form>

          <div className="ejemplos">
            <p className="ejemplos__titulo" id="titulo-ejemplos">
              {textos.verificar.ejemplosTitulo}
            </p>
            <ul className="ejemplos__lista" aria-labelledby="titulo-ejemplos">
              {textos.verificar.ejemplos.map((ejemplo) => (
                <li key={ejemplo.archivo}>
                  <button type="button" className="ficha" onClick={() => probarEjemplo(ejemplo)}>
                    {ejemplo.etiqueta}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {fase === "listo" && (
        <div className="acciones">
          <button type="button" className="boton" onClick={verOtro}>
            {textos.verificar.otroDocumento}
          </button>
        </div>
      )}
    </section>
  );
}
