import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import textos from "../content/textos.json";
import { huellaDeEnlace } from "../services/verificacion.js";
import ListaCredenciales from "../components/ListaCredenciales.jsx";

// Panel de la institución (ya detrás de la entrada con firma): lista, emitir y, plegado, buscar por código.
export default function Panel() {
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [codigoError, setCodigoError] = useState("");

  // Acepta el código suelto o el enlace de verificación completo.
  function abrir(evento) {
    evento.preventDefault();
    try {
      navegar(`/panel/credencial/${huellaDeEnlace(codigo)}`);
    } catch (fallo) {
      setCodigoError(fallo.codigo || "enlace-invalido");
    }
  }

  return (
    <section aria-labelledby="titulo-panel">
      <div className="encabezado">
        <h1 id="titulo-panel">{textos.panel.titulo}</h1>
        <Link className="boton" to="/panel/emitir">
          <span aria-hidden="true">+</span> {textos.panel.botonNueva}
        </Link>
      </div>
      <p>{textos.panel.intro}</p>

      <ListaCredenciales />

      <details className="buscar">
        <summary>{textos.panel.consultarTitulo}</summary>
        <form onSubmit={abrir} noValidate>
          <label htmlFor="campo-codigo-panel">{textos.panel.consultarEtiqueta}</label>
          <p className="ayuda" id="ayuda-codigo-panel">
            {textos.panel.consultarAyuda}
          </p>
          <div className="codigo__fila">
            <input
              id="campo-codigo-panel"
              className="campo"
              type="text"
              autoComplete="off"
              spellCheck="false"
              aria-describedby={codigoError ? "ayuda-codigo-panel error-codigo-panel" : "ayuda-codigo-panel"}
              aria-invalid={codigoError ? "true" : undefined}
              value={codigo}
              onChange={(evento) => {
                setCodigo(evento.target.value);
                setCodigoError("");
              }}
            />
            <button type="submit" className="boton boton--secundario">
              {textos.panel.consultarBoton}
            </button>
          </div>
          {codigoError && (
            <p className="error" id="error-codigo-panel" role="alert">
              {textos.errores[codigoError]}
            </p>
          )}
        </form>
      </details>
    </section>
  );
}
