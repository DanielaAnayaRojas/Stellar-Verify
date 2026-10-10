import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../content/textos.json";
import IconoEstado from "../components/IconoEstado.jsx";
import { listarCredenciales } from "../services/credencialesService.js";
import { formatearFecha } from "../services/formato.js";

export default function Panel() {
  const [lista, setLista] = useState(null);

  useEffect(() => {
    listarCredenciales().then(setLista);
  }, []);

  return (
    <section aria-labelledby="titulo-panel">
      <h1 id="titulo-panel">{textos.panel.titulo}</h1>
      <p>{textos.panel.intro}</p>
      <Link className="boton" to="/panel/emitir">
        {textos.panel.botonNueva}
      </Link>

      <h2 className="otras__titulo">{textos.panel.listaTitulo}</h2>
      {lista === null && (
        <div className="carga" role="status">
          <div className="carga__barra" aria-hidden="true" />
          <p>{textos.verificar.consultando}</p>
        </div>
      )}
      {lista !== null && lista.length === 0 && <p>{textos.vacio.credenciales}</p>}
      {lista !== null && lista.length > 0 && (
        <ul className="lista">
          {lista.map((c) => {
            const estado = c.estado === "revocada" ? "revocada" : "valida";
            return (
              <li key={c.huella} className="lista__item">
                <div>
                  <p className="lista__titular">
                    <Link to={`/panel/credencial/${c.huella}`}>{c.titular}</Link>
                  </p>
                  <p className="lista__logro">{c.logro}</p>
                  <p className="lista__fecha">
                    {textos.panel.emitidaEl.replace("{fecha}", formatearFecha(c.fechaEmision))}
                  </p>
                </div>
                <div className="lista__lado">
                  <span className={`estado estado--${estado}`}>
                    <IconoEstado estado={estado} tamano={18} />
                    {textos.resultados[estado].sello}
                  </span>
                  <Link className="lista__enlace" to={`/verificar/${c.huella}`}>
                    {textos.panel.verificacion}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
