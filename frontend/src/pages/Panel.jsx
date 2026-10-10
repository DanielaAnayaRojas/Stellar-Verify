import { useEffect, useState } from "react";
import textos from "../content/textos.json";
import { listarCredenciales } from "../services/credencialesService.js";

export default function Panel() {
  const [lista, setLista] = useState(null);

  useEffect(() => {
    listarCredenciales().then(setLista);
  }, []);

  return (
    <section aria-labelledby="titulo-panel">
      <h1 id="titulo-panel">{textos.nav.panel}</h1>
      {lista === null && <p role="status">{textos.verificar.consultando}</p>}
      {lista !== null && lista.length === 0 && <p>{textos.vacio.credenciales}</p>}
      {lista !== null && lista.length > 0 && (
        <ul>
          {lista.map((c) => (
            <li key={c.huella}>
              {c.titular}: {c.logro}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
