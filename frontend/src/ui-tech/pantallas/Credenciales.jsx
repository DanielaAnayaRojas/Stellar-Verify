// Lista de credenciales de la bóveda: pestañas por estado, búsqueda y verificación por fila. Solo datos reales.
// Las cuentas por pestaña son sobre lo ya cargado (contar toda la bóveda gastaría cientos de consultas a ACTA).
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../../content/textos-panel.json";
import { contar, fechaCorta, huellaCorta, tipoDeFallo } from "../../data/modelo.js";
import { leerBoveda, leerMas } from "../../data/real.js";
import { useSesionTech } from "../sesion.jsx";
import { useToast } from "../componentes/Toast.jsx";
import { useVerificar } from "../useVerificar.js";
import { Pill } from "../componentes/piezas.jsx";
import { morph } from "../movimiento.js";
import Icono from "../Iconos.jsx";
import insignia from "../../assets/ui-tech/ins-curso.webp";
import "../estilos/certificaciones.css";

const t = textos.credenciales;
const TABS = ["todas", "valida", "revocada", "noConfirmada"];

function normalizar(x) {
  return String(x ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function titulo(fila) {
  if (fila.curso) return fila.curso;
  return fila.estado === "sinComprobar" ? t.sinLeer : t.sinDatos;
}

function Fila({ fila, indice, verificacion, ocupado, alVerificar }) {
  const texto = titulo(fila);
  const verificando = verificacion?.estado === "verificando";
  const comprobada = verificacion && !verificando ? verificacion : null;
  const sinRespuesta = comprobada?.estado === "sinComprobar";
  const confirmada = comprobada && !sinRespuesta ? comprobada : null;
  const estadoMostrado = confirmada ? confirmada.estado : fila.estado;
  const vtn = `crow-${fila.huella}`;
  return (
    <div className="trow" role="row" style={{ viewTransitionName: vtn, viewTransitionClass: "morph", animationDelay: `${Math.min(indice, 10) * 30}ms` }}>
      <div role="cell">
        {fila.huellaEstandar ? (
          <Link className="cname" to={`/panel/credencial/${fila.huella}`}>
            {fila.estado === "noConfirmada" ? (
              <span className="c-alerta" aria-hidden="true">
                <Icono nombre="alerta" />
              </span>
            ) : (
              <img src={insignia} alt="" className={fila.estado === "revocada" ? "c-ins-rev" : undefined} />
            )}
            <span>
              <b>{texto}</b>
              <small className="mono">{t.codigo.replace("{codigo}", huellaCorta(fila.huella))}</small>
            </span>
          </Link>
        ) : (
          <span className="cname cname-plano">
            <span className="c-alerta" aria-hidden="true">
              <Icono nombre="alerta" />
            </span>
            <span>
              <b>{t.sinDatos}</b>
              <small className="mono">{t.codigo.replace("{codigo}", huellaCorta(fila.huella))} · {t.noEstandar}</small>
            </span>
          </span>
        )}
      </div>
      <div role="cell" className="muted num c-fecha">{fila.fecha ? fechaCorta(fila.fecha) : "—"}</div>
      <div role="cell">
        <Pill estado={estadoMostrado} />
      </div>
      <div role="cell">
        {fila.huellaEstandar && (!comprobada || sinRespuesta) ? (
          <button
            type="button"
            className="btn btn-line btn-sm vb"
            onClick={() => !verificando && alVerificar(fila.huella, texto)}
            disabled={ocupado && !verificando}
            aria-disabled={verificando || undefined}
            aria-label={verificando ? undefined : `${textos.verificar.boton}: ${texto}`}
          >
            {verificando && <span className="spin" aria-hidden="true" />}
            {verificando ? textos.verificar.verificando : comprobada ? textos.verificar.otraVez : textos.verificar.boton}
          </button>
        ) : confirmada ? (
          <Pill estado={confirmada.estado} className="swap" role="status" />
        ) : null}
      </div>
    </div>
  );
}

export default function Credenciales() {
  const { estado: estadoSesion, expirar } = useSesionTech();
  const avisar = useToast();
  const [lista, setLista] = useState(null);
  const [lectura, setLectura] = useState({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const [limiteEn, setLimiteEn] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [q, setQ] = useState("");
  const [anuncio, setAnuncio] = useState("");
  const alerta = useRef(null);
  const { verificaciones, ocupado, verificar, reiniciar } = useVerificar({ avisar, expirar, onAnuncio: setAnuncio });

  useEffect(() => {
    document.title = `${t.titulo} · ${textos.marca}`;
  }, []);

  useEffect(() => {
    if (estadoSesion !== "dentro") return undefined;
    let activo = true;
    setLectura({ tipo: "cargando" });
    leerBoveda({ usarMemoria: intento === 0 })
      .then((leida) => {
        if (!activo) return;
        setLista(leida);
        setLectura(null);
        reiniciar();
      })
      .catch((fallo) => {
        if (!Number.isInteger(fallo?.status)) console.error(fallo);
        if (!activo) return;
        const tipo = tipoDeFallo(fallo);
        if (tipo === "sesion") expirar();
        else {
          if (tipo === "limite") setLimiteEn(Date.now());
          setLectura({ tipo });
        }
      });
    return () => {
      activo = false;
    };
  }, [estadoSesion, intento, expirar, reiniciar]);

  const cargarMas = useCallback(async () => {
    if (!lista) return;
    setCargandoMas(true);
    try {
      setLista(await leerMas(lista));
    } catch (fallo) {
      const tipo = tipoDeFallo(fallo);
      if (tipo === "sesion") expirar();
      else {
        if (tipo === "limite") setLimiteEn(Date.now());
        avisar({ clave: "mas", tono: "error", texto: tipo === "limite" ? t.errorLimite : tipo === "conexion" ? t.errorConexion : t.errorServicio });
      }
    } finally {
      setCargandoMas(false);
    }
  }, [lista, avisar, expirar]);

  // Espera de un minuto tras un límite o una lectura, para no agotar el cupo de ACTA al reintentar.
  const [, refrescar] = useState(0);
  const libreEn = Math.max(lista?.leidaEn ?? 0, limiteEn) + 60_000;
  const enEspera = Date.now() < libreEn;
  useEffect(() => {
    if (!enEspera) return undefined;
    const temporizador = setTimeout(() => refrescar((n) => n + 1), libreEn - Date.now() + 50);
    return () => clearTimeout(temporizador);
  }, [enEspera, libreEn]);

  const pedida = useRef(false);
  const reintentar = () => {
    pedida.current = true;
    setIntento((n) => n + 1);
  };
  useEffect(() => {
    if (pedida.current && lectura && lectura.tipo !== "cargando") {
      pedida.current = false;
      alerta.current?.focus();
    }
  }, [lectura]);

  const cuenta = lista ? contar(lista.filas) : null;
  const etiquetaTab = (tab) => {
    const n = tab === "todas" ? cuenta?.todas : cuenta?.[tab];
    return `${t.tabs[tab]}${cuenta ? ` ${n}` : ""}`;
  };
  const cambiarTab = (tab) => {
    if (tab !== filtro) morph(() => setFiltro(tab), { win: window });
  };

  const buscado = normalizar(q).replace(/\s+/g, "");
  const visibles = (lista?.filas ?? []).filter((fila) => {
    if (filtro !== "todas" && fila.estado !== filtro) return false;
    if (!buscado) return true;
    return fila.huella.startsWith(buscado) || normalizar(fila.curso).replace(/\s+/g, "").includes(buscado);
  });

  return (
    <>
      <div className="page-head rise">
        <div>
          <h1 className="h1">{t.titulo}</h1>
          <p className="lede">{t.lema}</p>
        </div>
        {estadoSesion === "dentro" && (
          <Link className="btn btn-green" to="/panel/emitir">
            <Icono nombre="mas" grosor={2.2} />
            {textos.nav.emitir}
          </Link>
        )}
      </div>

      {estadoSesion !== "dentro" ? (
        <p className="r-estado" role="status">
          <span className="spin" aria-hidden="true" />
          {textos.sesion.comprobando}
        </p>
      ) : (
        <>
          <div className="toolbar rise" style={{ animationDelay: "60ms", marginTop: 18 }}>
            <div className="tabs" role="tablist" aria-label={t.titulo}>
              {TABS.map((tab) => (
                <button key={tab} className="tab" type="button" role="tab" aria-selected={filtro === tab} onClick={() => cambiarTab(tab)}>
                  {filtro === tab && <span className="tab-pill" style={{ viewTransitionName: "ctabpill", viewTransitionClass: "pill-vt" }} aria-hidden="true" />}
                  <span className="tab-l">{t.tabs[tab]}</span>
                  {cuenta && <span className="tab-n num">{tab === "todas" ? cuenta.todas : cuenta[tab]}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar rise" style={{ animationDelay: "100ms" }}>
            <label className="isearch">
              <Icono nombre="buscar" grosor={2} />
              <span className="sr">{t.buscarEtiqueta}</span>
              <input type="search" placeholder={t.buscar} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck="false" />
            </label>
          </div>

          <div className="card ctable ctable-4 rise" style={{ animationDelay: "160ms" }}>
            <div className="cscroll">
              <div role="table" aria-label={t.titulo}>
                <div className="thead" role="row">
                  <span role="columnheader">{t.colCredencial}</span>
                  <span role="columnheader">{t.colFecha}</span>
                  <span role="columnheader">{t.colEstado}</span>
                  <span role="columnheader">{t.colVerificar}</span>
                </div>
                {lectura?.tipo === "cargando" ? (
                  <p className="empty" role="status">
                    <span className="spin" aria-hidden="true" /> {t.cargando}
                  </p>
                ) : lectura ? (
                  <div className="empty" role="alert" ref={alerta} tabIndex={-1}>
                    <p>{{ limite: t.errorLimite, conexion: t.errorConexion }[lectura.tipo] ?? t.errorServicio}</p>
                    <button type="button" className="btn btn-line btn-sm" onClick={() => !enEspera && reintentar()} aria-disabled={enEspera || undefined}>
                      {t.reintentar}
                    </button>
                    {enEspera && <p className="help">{t.reintentarEspera}</p>}
                  </div>
                ) : !lista ? null : visibles.length === 0 ? (
                  <p className="empty">{lista.filas.length === 0 ? t.vacia : t.vaciaFiltro}</p>
                ) : (
                  visibles.map((fila, i) => (
                    <Fila key={fila.huella} fila={fila} indice={i} verificacion={verificaciones[fila.huella]} ocupado={ocupado} alVerificar={verificar} />
                  ))
                )}
              </div>
            </div>
            {lista && lista.filas.length > 0 && (
              <div className="foot">
                <span className="num">{t.mostrando.replace("{cargadas}", String(lista.filas.length)).replace("{total}", String(lista.total))}</span>
                {lista.hayMas && (
                  <button type="button" className="btn btn-line btn-sm" onClick={cargarMas} disabled={cargandoMas || enEspera} title={enEspera ? t.reintentarEspera : undefined}>
                    {cargandoMas && <span className="spin" aria-hidden="true" />}
                    {t.cargarMas}
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="sr" aria-live="polite">
            {anuncio}
          </p>
        </>
      )}
    </>
  );
}
