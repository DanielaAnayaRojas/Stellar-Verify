// Hooks de movimiento de la UI tech. La matemática vive en movimiento.js (probada aparte).
import { useCallback, useEffect, useRef, useState } from "react";
import { inclinacion, prefiereReducir, valorConteo } from "./movimiento.js";

export { morph } from "./movimiento.js";

// Conteo animado de 0 al destino con requestAnimationFrame (1.100 ms, ease-out cuártica).
// Con movimiento reducido, o si el destino no es un número, muestra el valor final de inmediato.
export function useCountUp(destino, { duracion = 1100, retraso = 180 } = {}) {
  const [valor, setValor] = useState(() => (prefiereReducir() ? destino : 0));
  useEffect(() => {
    if (!Number.isFinite(destino) || prefiereReducir()) {
      setValor(destino);
      return undefined;
    }
    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = ahora - inicio;
      setValor(valorConteo(destino, t, { duracion, retraso }));
      if (t < retraso + duracion) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino, duracion, retraso]);
  return valor;
}

// Inclinación 3D siguiendo el puntero (120 ms) y vuelta suave al soltar (700 ms, en el CSS de .cert).
// No se activa con el tacto ni con movimiento reducido.
export function usePointerTilt() {
  const [estado, setEstado] = useState({ siguiendo: false, rx: 0, ry: 0, mx: 50, my: 30 });
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onPointerMove = useCallback((evento) => {
    if (evento.pointerType === "touch" || prefiereReducir()) return;
    const siguiente = { siguiendo: true, ...inclinacion(evento.clientX, evento.clientY, evento.currentTarget.getBoundingClientRect()) };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setEstado(siguiente));
  }, []);

  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setEstado((previo) => ({ ...previo, siguiendo: false, rx: 0, ry: 0 }));
  }, []);

  const style = {
    transform: `rotateX(${estado.rx.toFixed(2)}deg) rotateY(${estado.ry.toFixed(2)}deg)`,
    "--mx": `${estado.mx.toFixed(1)}%`,
    "--my": `${estado.my.toFixed(1)}%`,
  };
  return { siguiendo: estado.siguiendo, style, onPointerMove, onPointerLeave };
}
