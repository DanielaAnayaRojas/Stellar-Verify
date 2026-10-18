import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import textos from "../content/textos.json";
import { panelApi } from "../services/panelApi.js";
import { wallet } from "../services/freighter.js";
import { loginWithWallet } from "../services/signingFlow.js";
import { mapError } from "../services/txError.js";
import { msHastaAviso } from "../services/sesionAviso.js";
import { mensajeDeError } from "./FirmaEstado.jsx";
import AvisoSesion from "./AvisoSesion.jsx";

const SesionPanel = createContext(null);

// { sesion: { publicKey, institutionName, expiresAt }, expirar() } — expirar() devuelve a la pantalla de entrada.
export function useSesionPanel() {
  return useContext(SesionPanel);
}

// Protege todas las pantallas del panel: sin una sesión válida solo se ve la entrada con firma.
export default function PanelGate() {
  const [fase, setFase] = useState("comprobando");
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState("");
  const [avisoSesion, setAvisoSesion] = useState(false);

  useEffect(() => {
    let vigente = true;
    panelApi
      .getSession()
      .then((actual) => {
        if (!vigente) return;
        if (actual.authenticated) {
          setSesion(actual);
          setFase("dentro");
        } else {
          setFase("entrar");
        }
      })
      .catch(() => vigente && setFase("sin-servicio"));
    return () => {
      vigente = false;
    };
  }, []);

  // Cinco minutos antes de que termine la sesión se muestra una ventana de aviso (una sola vez por sesión).
  useEffect(() => {
    setAvisoSesion(false);
    if (fase !== "dentro" || !sesion) return undefined;
    const espera = msHastaAviso(sesion.expiresAt);
    if (espera === null) return undefined;
    const temporizador = setTimeout(() => setAvisoSesion(true), espera);
    return () => clearTimeout(temporizador);
  }, [fase, sesion]);

  const entrar = useCallback(async () => {
    setError(null);
    setAviso("");
    setFase("entrando");
    try {
      setSesion(await loginWithWallet({ api: panelApi, wallet }));
      setFase("dentro");
    } catch (fallo) {
      setError(mapError(fallo));
      setFase("entrar");
    }
  }, []);

  const salir = useCallback(async () => {
    try {
      await panelApi.logout();
    } catch {
      // Sin respuesta del servidor igual se cierra aquí; la cookie caduca sola a los 30 minutos.
    }
    setSesion(null);
    setFase("entrar");
  }, []);

  const expirar = useCallback(() => {
    setSesion(null);
    setError(null);
    setAviso(textos.entrar.sesionTerminada);
    setFase("entrar");
  }, []);

  if (fase === "comprobando") {
    return (
      <div className="carga" role="status">
        <div className="carga__barra" aria-hidden="true" />
        <p>{textos.entrar.comprobando}</p>
      </div>
    );
  }

  if (fase === "sin-servicio") {
    return (
      <section>
        <p className="error" role="alert">
          {textos.entrar.sinServicio}
        </p>
        <button type="button" className="boton" onClick={() => window.location.reload()}>
          {textos.entrar.reintentar}
        </button>
      </section>
    );
  }

  if (fase === "entrar" || fase === "entrando") {
    const firmando = fase === "entrando";
    return (
      <section aria-labelledby="titulo-entrar">
        <h1 id="titulo-entrar">{textos.entrar.titulo}</h1>
        <p>{textos.entrar.texto}</p>

        <div aria-live="polite" aria-atomic="true">
          {aviso && <p className="aviso">{aviso}</p>}
          {error && (
            <p className="error" role="alert">
              {mensajeDeError(error)}
            </p>
          )}
          {firmando && (
            <div className="carga" role="status">
              <div className="carga__barra" aria-hidden="true" />
              <p>{textos.entrar.firmando}</p>
            </div>
          )}
        </div>

        <div className="acciones">
          <button type="button" className="boton" onClick={entrar} disabled={firmando}>
            {textos.entrar.boton}
          </button>
        </div>
      </section>
    );
  }

  return (
    <SesionPanel.Provider value={{ sesion, expirar }}>
      <div className="barra-panel">
        <p>{textos.panel.sesion.replace("{institucion}", sesion.institutionName || "la institución")}</p>
        <button type="button" className="boton boton--secundario" onClick={salir}>
          {textos.panel.salir}
        </button>
      </div>
      <Outlet />
      {avisoSesion && <AvisoSesion alCerrar={() => setAvisoSesion(false)} />}
    </SesionPanel.Provider>
  );
}
