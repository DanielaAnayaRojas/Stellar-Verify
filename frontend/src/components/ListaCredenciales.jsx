import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../content/textos.json";
import { panelApi } from "../services/panelApi.js";
import { formatearFecha } from "../services/formato.js";
import { claveDeEstado, guardarEnMemoria, juntar, leerDeMemoria, separar } from "../services/lista.js";
import { useSesionPanel } from "./PanelGate.jsx";
import { Roseta } from "./Sello.jsx";
import BotonCopiar from "./BotonCopiar.jsx";

const PAGINA = 10;

function textoDeEstado(clave) {
  if (clave === "noVerificable") return textos.panel.lista.sinComprobar;
  return textos.resultados[clave].sello;
}

// Lista del vault de la institución: las credenciales reales y, plegada, la sección de sospechosas.
// Nada se oculta sin avisar: el conteo de sospechosas está siempre visible. Aquí no se revoca nada:
// «Revisar y revocar» lleva al detalle, donde la persona confirma y firma una por una.
export default function ListaCredenciales() {
  const { expirar } = useSesionPanel();
  // Si ya se leyó la lista antes, se muestra al instante y se actualiza por detrás.
  const [previa] = useState(leerDeMemoria);
  const [fase, setFase] = useState(previa ? "ok" : "cargando");
  const [filas, setFilas] = useState(previa ? previa.filas : []);
  const [siguiente, setSiguiente] = useState(previa ? previa.siguiente : 0);
  const [hayMas, setHayMas] = useState(previa ? previa.hayMas : false);
  const [total, setTotal] = useState(previa ? previa.total : 0);
  const [cargandoMas, setCargandoMas] = useState(false);

  const cargar = useCallback(
    async (desde, previas) => {
      try {
        const pagina = await panelApi.listCredentials({ offset: desde, limit: PAGINA });
        const nuevas = juntar(previas, pagina.items);
        const lista = {
          filas: nuevas,
          siguiente: desde + PAGINA,
          hayMas: pagina.hasMore === true,
          total: Number.isFinite(pagina.total) ? pagina.total : 0,
        };
        setFilas(lista.filas);
        setSiguiente(lista.siguiente);
        setHayMas(lista.hayMas);
        setTotal(lista.total);
        setFase("ok");
        guardarEnMemoria(lista);
      } catch (fallo) {
        if (fallo && fallo.codigo === "no_autenticado") expirar();
        // Con algo ya en pantalla (de la memoria o de páginas anteriores) se conserva; solo sin nada se muestra el error.
        setFase(previas.length > 0 || leerDeMemoria() ? "ok" : "error");
      }
    },
    [expirar],
  );

  useEffect(() => {
    cargar(0, []);
  }, [cargar]);

  async function cargarMas() {
    setCargandoMas(true);
    await cargar(siguiente, filas);
    setCargandoMas(false);
  }

  function reintentar() {
    setFase("cargando");
    cargar(0, []);
  }

  const { reales, sospechosas } = separar(filas);

  return (
    <section className="lista-cred" aria-labelledby="titulo-lista-cred">
      <h2 id="titulo-lista-cred">
        {textos.panel.lista.titulo}
      </h2>
      <p className="ayuda">{textos.panel.lista.ayuda}</p>

      <div aria-live="polite" aria-atomic="true">
        {fase === "cargando" && (
          <div className="carga" role="status">
            <div className="carga__barra" aria-hidden="true" />
            <p>{textos.panel.lista.cargando}</p>
          </div>
        )}

        {fase === "error" && (
          <div role="alert">
            <p className="error">{textos.panel.lista.error}</p>
            <button type="button" className="boton" onClick={reintentar}>
              {textos.panel.lista.reintentar}
            </button>
          </div>
        )}
      </div>

      {fase === "ok" && (
        <>
          {reales.length === 0 ? (
            <p>{textos.panel.lista.vacia}</p>
          ) : (
            <ul className="lista-cred__lista">
              {reales.map((fila) => {
                const clave = claveDeEstado(fila.estado);
                return (
                  <li key={fila.huella} className="lista-cred__fila">
                    <Roseta tipo={clave} className={`lista-cred__icono lista-cred__icono--${clave}`} />
                    <div className="lista-cred__texto">
                      <strong>{fila.curso || textoDeEstado(clave)}</strong>
                      <span className={`lista-cred__meta lista-cred__meta--${clave}`}>
                        {textoDeEstado(clave)}
                        {fila.fecha ? ` · ${formatearFecha(fila.fecha)}` : ""}
                      </span>
                    </div>
                    <Link className="boton boton--secundario" to={`/panel/credencial/${fila.huella}`}>
                      {textos.panel.lista.ver}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <details className="lista-cred__sospechosas">
            <summary>{textos.panel.lista.sospechosas.replace("{n}", String(sospechosas.length))}</summary>
            <p className="ayuda">{textos.panel.lista.sospechosasAyuda}</p>
            {sospechosas.length === 0 ? (
              <p>{textos.panel.lista.sospechosasNinguna}</p>
            ) : (
              <ul className="lista-cred__lista">
                {sospechosas.map((fila) => (
                  <li key={fila.huella} className="lista-cred__fila">
                    <Roseta tipo="emisorNoReconocido" className="lista-cred__icono lista-cred__icono--emisorNoReconocido" />
                    <div className="lista-cred__texto">
                      <strong>{textos.panel.lista.sospechosaSello}</strong>
                      <span className="lista-cred__meta mono">{fila.huella}</span>
                      {fila.yaRevocada && <span className="lista-cred__meta">{textos.panel.lista.yaRevocada}</span>}
                      {!fila.revocable && <span className="lista-cred__meta">{textos.panel.lista.noRevocable}</span>}
                    </div>
                    <BotonCopiar valor={fila.huella} />
                    {fila.revocable && !fila.yaRevocada && (
                      <Link className="boton boton--secundario" to={`/panel/credencial/${fila.huella}`}>
                        {textos.panel.lista.revisar}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>

          {hayMas && (
            <>
              <p className="ayuda">
                {textos.panel.lista.mostrando.replace("{n}", String(filas.length)).replace("{total}", String(total))}
              </p>
              <button type="button" className="boton boton--secundario" onClick={cargarMas} disabled={cargandoMas}>
                {textos.panel.lista.cargarMas}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
