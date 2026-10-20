// Sesión de la institución en el panel tech. A diferencia de PanelGate, el panel se ve sin sesión:
// lo que exige la bóveda real (cifras, lista, emitir, revocar) pide entrar con Freighter.
// Usa los mismos servicios que el panel anterior (no cambia nada del servidor).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import textos from "../content/textos-panel.json";
import { createPanelApi } from "../services/panelApi.js";
import { wallet } from "../services/freighter.js";
import { loginWithWallet } from "../services/signingFlow.js";
import { mapError } from "../services/txError.js";
import { mensajeDeError } from "../components/FirmaEstado.jsx";
import { olvidarBoveda } from "../data/real.js";
import { msHastaAvisoFin, msHastaRevisar } from "../data/plazos.js";
import { useToast } from "./componentes/Toast.jsx";

// Desfase entre el reloj del servidor y el de este equipo, estimado con la cabecera Date de cada respuesta.
// expiresAt viene en hora del servidor: los plazos se calculan con "ahora del servidor", no con la del equipo.
let desfase = 0;
const api = createPanelApi({
  fetchImpl: async (...args) => {
    const respuesta = await globalThis.fetch(...args);
    const servidor = Date.parse(respuesta.headers?.get?.("date") ?? "");
    if (Number.isFinite(servidor)) desfase = servidor - Date.now();
    return respuesta;
  },
});
const ahoraServidor = () => Date.now() + desfase;

const ContextoSesion = createContext(null);

// { estado: "comprobando" | "sin-servicio" | "fuera" | "entrando" | "dentro", renovando, sesion, error, aviso,
//   entrar(), salir(), expirar(), reintentar() }
export function useSesionTech() {
  return useContext(ContextoSesion);
}

export function SesionTechProvider({ children }) {
  const avisar = useToast();
  const [estado, setEstado] = useState("comprobando");
  const [renovando, setRenovando] = useState(false);
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  // La sesión vigente, para decidir qué hacer si una renovación falla (la cookie anterior sigue valiendo).
  const vigente = useRef(null);
  vigente.current = sesion;
  // Época de la sesión: salir y expirar la suben. Una firma o una revisión que termina después de una salida
  // pertenece a una época vieja y se descarta (si no, "Salir" mientras Freighter firma reviviría la sesión).
  const epoca = useRef(0);

  useEffect(() => {
    let activo = true;
    setEstado("comprobando");
    api
      .getSession()
      .then((actual) => {
        if (!activo) return;
        setSesion(actual.authenticated ? actual : null);
        setEstado(actual.authenticated ? "dentro" : "fuera");
      })
      .catch(() => activo && setEstado("sin-servicio"));
    return () => {
      activo = false;
    };
  }, [intento]);

  const entrar = useCallback(async () => {
    const anterior = vigente.current;
    const inicio = epoca.current;
    setError(null);
    setAviso("");
    // Renovar con una sesión vigente no saca de "dentro": la pantalla no se vacía mientras Freighter firma.
    if (anterior) setRenovando(true);
    else setEstado("entrando");
    try {
      const nueva = await loginWithWallet({ api, wallet });
      if (epoca.current !== inicio) {
        // La persona salió mientras firmaba: la cookie que acaba de crear el servidor se descarta.
        api.logout().catch(() => {});
        return;
      }
      // Renovar con la misma cuenta no cambia la bóveda: no se relee (cada lectura gasta consultas a ACTA).
      if (!anterior || anterior.publicKey !== nueva.publicKey) olvidarBoveda();
      avisar.cerrarClave("sesion");
      setSesion(nueva);
      setEstado("dentro");
    } catch (fallo) {
      if (epoca.current !== inicio) return;
      const motivo = mapError(fallo);
      if (anterior) {
        // La renovación falló pero la sesión anterior sigue: se queda dentro, se avisa y se ofrece reintentar.
        avisar({ clave: "sesion-error", tono: "error", texto: mensajeDeError(motivo), accion: { texto: textos.sesion.renovar, alPulsar: () => entrarRef.current() } });
      } else {
        setError(motivo);
        setEstado("fuera");
      }
    } finally {
      if (epoca.current === inicio) setRenovando(false);
    }
  }, [avisar]);
  const entrarRef = useRef(entrar);
  entrarRef.current = entrar;

  const salir = useCallback(async () => {
    epoca.current += 1;
    setRenovando(false);
    avisar.cerrarClave("sesion");
    avisar.cerrarClave("sesion-error");
    try {
      await api.logout();
    } catch {
      // Sin respuesta del servidor igual se cierra aquí; la cookie caduca sola a los 30 minutos.
    }
    olvidarBoveda();
    setSesion(null);
    setError(null);
    setEstado("fuera");
  }, [avisar]);

  const expirar = useCallback(() => {
    epoca.current += 1;
    setRenovando(false);
    avisar.cerrarClave("sesion");
    avisar.cerrarClave("sesion-error");
    olvidarBoveda();
    setSesion(null);
    setError(null);
    setAviso(textos.sesion.terminada);
    setEstado("fuera");
  }, [avisar]);

  // Aviso cuando faltan menos de 5 minutos. Al vencer el plazo se pregunta al servidor: solo su
  // "no autenticado" cierra la sesión.
  useEffect(() => {
    if (estado !== "dentro" || !sesion) return undefined;
    const temporizadores = [];
    const espera = msHastaAvisoFin(sesion.expiresAt, ahoraServidor());
    if (espera !== null) {
      temporizadores.push(
        setTimeout(
          () => avisar({ clave: "sesion", texto: textos.sesion.avisoFin, accion: { texto: textos.sesion.renovar, alPulsar: entrar } }),
          espera,
        ),
      );
    }
    temporizadores.push(
      setTimeout(() => {
        const inicio = epoca.current;
        // Si la persona salió mientras se preguntaba, la respuesta ya no aplica.
        api
          .getSession()
          .then((actual) => {
            if (epoca.current !== inicio) return;
            if (actual.authenticated) setSesion({ ...actual });
            else expirar();
          })
          .catch(() => epoca.current === inicio && setSesion((s) => (s ? { ...s } : s)));
      }, msHastaRevisar(sesion.expiresAt, ahoraServidor())),
    );
    return () => temporizadores.forEach(clearTimeout);
  }, [estado, sesion, avisar, entrar, expirar]);

  const valor = useMemo(
    () => ({ estado, renovando, sesion, error, aviso, entrar, salir, expirar, reintentar: () => setIntento((n) => n + 1) }),
    [estado, renovando, sesion, error, aviso, entrar, salir, expirar],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
