// Avisos breves del panel (no estaban en el diseño: mismo sistema visual, tarjeta nocturna con acento lima).
// Una región aria-live "polite" para avisos y otra "assertive" para errores. Se cierran solos a los 6 s,
// salvo que tengan una acción o que el puntero o el foco estén sobre ellos.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import textos from "../../content/textos-panel.json";
import Icono from "../Iconos.jsx";

const sinProveedor = Object.assign(() => {}, { cerrar: () => {}, cerrarClave: () => {} });
const ContextoToast = createContext(sinProveedor);

export function useToast() {
  return useContext(ContextoToast);
}

let siguienteId = 1;

function Toast({ aviso, alCerrar }) {
  const [pausado, setPausado] = useState(false);
  const caja = useRef(null);
  // Si el aviso que se cierra tenía el foco (p. ej. su botón), el foco pasa al contenido y no cae al <body>.
  const cerrar = () => {
    if (caja.current?.contains(document.activeElement)) document.getElementById("contenido")?.focus({ preventScroll: true });
    alCerrar(aviso.id);
  };
  useEffect(() => {
    if (pausado || aviso.accion || aviso.fijo) return undefined;
    const temporizador = setTimeout(() => alCerrar(aviso.id), aviso.duracion ?? 6000);
    return () => clearTimeout(temporizador);
  }, [pausado, aviso, alCerrar]);

  return (
    <div
      ref={caja}
      className={`toast toast-${aviso.tono ?? "info"} swap`}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span className="toast-dot" aria-hidden="true" />
      <p className="toast-t">{aviso.texto}</p>
      {aviso.accion && (
        <button
          type="button"
          className="toast-a"
          onClick={() => {
            cerrar();
            aviso.accion.alPulsar();
          }}
        >
          {aviso.accion.texto}
        </button>
      )}
      <button type="button" className="toast-x" aria-label={textos.toast.cerrar} onClick={cerrar}>
        <Icono nombre="cerrar" grosor={2} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const cerrar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  // avisar({ texto, tono: "info" | "ok" | "error", accion?: { texto, alPulsar }, clave?, fijo? })
  // "clave" evita duplicados: un aviso con la misma clave reemplaza al anterior.
  const avisar = useCallback((aviso) => {
    const id = siguienteId++;
    setAvisos((lista) => {
      const sinRepetido = aviso.clave ? lista.filter((a) => a.clave !== aviso.clave) : lista;
      return [...sinRepetido, { ...aviso, id }].slice(-3);
    });
    return id;
  }, []);

  // Cierra el aviso con esa clave (p. ej. el de "la sesión termina" al salir o al vencer).
  const cerrarClave = useCallback((clave) => setAvisos((lista) => lista.filter((a) => a.clave !== clave)), []);

  const valor = useMemo(() => Object.assign(avisar, { cerrar, cerrarClave }), [avisar, cerrar, cerrarClave]);
  // El final del contenido deja libre la altura real de los avisos (uno o varios apilados).
  const pila = useRef(null);
  useEffect(() => {
    const nodo = pila.current;
    const raiz = nodo?.closest(".sv");
    if (!nodo || !raiz || typeof ResizeObserver === "undefined") return undefined;
    const medir = () => raiz.style.setProperty("--sv-toasts-h", `${Math.ceil(nodo.getBoundingClientRect().height)}px`);
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    medir();
    return () => {
      observador.disconnect();
      raiz.style.removeProperty("--sv-toasts-h");
    };
  }, []);

  const errores = avisos.filter((a) => a.tono === "error");
  const otros = avisos.filter((a) => a.tono !== "error");

  return (
    <ContextoToast.Provider value={valor}>
      {children}
      <div className="toasts" ref={pila}>
        <div aria-live="polite" aria-relevant="additions">
          {otros.map((a) => (
            <Toast key={a.id} aviso={a} alCerrar={cerrar} />
          ))}
        </div>
        <div aria-live="assertive" aria-relevant="additions">
          {errores.map((a) => (
            <Toast key={a.id} aviso={a} alCerrar={cerrar} />
          ))}
        </div>
      </div>
    </ContextoToast.Provider>
  );
}
