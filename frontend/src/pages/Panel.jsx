import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import textos from "../content/textos.json";
import { prepararHuella } from "../services/verificacion.js";
import ListaCredenciales from "../components/ListaCredenciales.jsx";

// Panel de la institución (ya detrás de la entrada con firma). Desde aquí se emite y se abre una
// credencial por su huella para ver su estado o revocarla.
export default function Panel() {
  const navegar = useNavigate();
  const [huella, setHuella] = useState("");
  const [codigoError, setCodigoError] = useState("");

  function abrir(evento) {
    evento.preventDefault();
    try {
      navegar(`/panel/credencial/${prepararHuella(huella)}`);
    } catch (fallo) {
      setCodigoError(fallo.codigo);
    }
  }

  return (
    <section aria-labelledby="titulo-panel">
      <h1 id="titulo-panel">{textos.panel.titulo}</h1>
      <p>{textos.panel.intro}</p>
      <Link className="boton" to="/panel/emitir">
        {textos.panel.botonNueva}
      </Link>

      <ListaCredenciales />

      <h2 className="otras__titulo">{textos.panel.consultarTitulo}</h2>
      <form className="otra" onSubmit={abrir} noValidate>
        <label htmlFor="campo-huella-panel">{textos.panel.consultarEtiqueta}</label>
        <p className="ayuda" id="ayuda-huella-panel">
          {textos.panel.consultarAyuda}
        </p>
        <div className="otra__fila">
          <input
            id="campo-huella-panel"
            className="campo mono"
            type="text"
            autoComplete="off"
            spellCheck="false"
            aria-describedby="ayuda-huella-panel"
            aria-invalid={codigoError ? "true" : undefined}
            value={huella}
            onChange={(evento) => {
              setHuella(evento.target.value);
              setCodigoError("");
            }}
          />
          <button type="submit" className="boton boton--secundario">
            {textos.panel.consultarBoton}
          </button>
        </div>
        {codigoError && (
          <p className="error" role="alert">
            {textos.errores[codigoError]}
          </p>
        )}
      </form>
    </section>
  );
}
