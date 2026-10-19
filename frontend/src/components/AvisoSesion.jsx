import { useEffect, useRef } from "react";
import textos from "../content/textos.json";

// Ventana que avisa que la sesión está por terminar. Se queda hasta que la persona pulsa "Entendido" (o Escape).
export default function AvisoSesion({ alCerrar }) {
  const boton = useRef(null);

  useEffect(() => {
    if (boton.current) boton.current.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (evento) => {
      if (evento.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  return (
    <div className="modal-fondo">
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-aviso-sesion"
        aria-describedby="texto-aviso-sesion"
      >
        <h2 id="titulo-aviso-sesion">{textos.sesion.avisoTitulo}</h2>
        <p id="texto-aviso-sesion">{textos.sesion.avisoTexto}</p>
        <div className="acciones">
          <button type="button" className="boton" onClick={alCerrar} ref={boton}>
            {textos.sesion.avisoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
