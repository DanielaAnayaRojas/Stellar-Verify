// Detalle de una credencial: datos reales, identificador y cuenta de la institución, el registro tipo terminal con
// los pasos reales, una representación visual (no el documento) y la revocación con la firma de Freighter.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import textos from "../../content/textos-panel.json";
import { cuentaCorta, fechaLarga, huellaCorta } from "../../data/modelo.js";
import { esRevocable, leerDetalle, marcarRevocada, recargarTrasRevocar, registroVerificacion } from "../../data/detalle.js";
import { enlaceTransaccion } from "../../services/emision.js";
import { panelApi } from "../../services/panelApi.js";
import { wallet } from "../../services/freighter.js";
import { runSigning } from "../../services/signingFlow.js";
import { initialSigningState, signingReducer } from "../../services/signingMachine.js";
import { mensajeDeError } from "../../components/FirmaEstado.jsx";
import { useSesionTech } from "../sesion.jsx";
import { useToast } from "../componentes/Toast.jsx";
import { usePointerTilt } from "../hooks.js";
import { Pill } from "../componentes/piezas.jsx";
import Icono from "../Iconos.jsx";
import papel from "../../assets/ui-tech/diploma-papel.webp";
import marca from "../../assets/ui-tech/tech-logo-mark-dark.webp";
import sello from "../../assets/ui-tech/sello-titulo.webp";
import "../estilos/detalle.css";

const td = textos.detalle;
const EN_CURSO = ["simulando", "esperando-firma", "enviando"];

// Representación de la credencial (no el documento): paja neutra, marca Stellar-Verify, curso, fecha y QR.
function Certificado({ detalle, escaneando, verificada }) {
  const tilt = usePointerTilt();
  const revocada = detalle.estado === "revocada";
  return (
    <div className="cert-wrap cert-enter">
      <div className={`cert${tilt.siguiendo ? " is-tracking" : ""}`} style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
        <img className="cert-bg" src={papel} alt="" />
        <div className="cert-in">
          <img className="cert-em" src={marca} alt="" width="48" height="48" />
          <p className="c-inst">{(detalle.institucion || "Institución").toUpperCase()}</p>
          <span className="c-rule" aria-hidden="true" />
          <p className="c-small">{td.certifica}</p>
          <p className="c-degree">{detalle.curso || "—"}</p>
          {detalle.fecha && <p className="c-date num">{fechaLarga(detalle.fecha)}</p>}
          <p className="c-micro">{td.sinValor}</p>
          <div className="c-foot">
            <div className="c-seal">
              <img src={sello} alt="" />
              <span className="shine" aria-hidden="true" />
            </div>
            {detalle.qr && <div className="c-qr"><img src={detalle.qr} alt="" width="120" height="120" /></div>}
          </div>
        </div>
        <span className="c-badge"><img src={marca} alt="" />{td.red}</span>
        <span className="sheen" aria-hidden="true" />
        {escaneando && <span className="scan" aria-hidden="true" />}
        {verificada && !revocada && (
          <span className="ok-chip">
            <Icono nombre="check" grosor={2.6} />
            {td.okChip}
          </span>
        )}
        {revocada && <span className="ok-chip ok-chip-rev">{td.revChip}</span>}
      </div>
    </div>
  );
}

function Registro({ detalle, cuenta, enCurso }) {
  const pasos = registroVerificacion(detalle, { cuenta });
  return (
    <div className="vlog" role="log" aria-live="polite">
      <p className="vl-h">
        <span>{td.logTitulo}</span>
        <b>{enCurso ? td.logEnCurso : td.logHecho}</b>
      </p>
      <ol>
        {pasos.map((paso) => (
          <li key={paso.etiqueta} className={`vl-${paso.tono}`}>
            {paso.tono === "ok" ? <Icono nombre="check" grosor={2.6} /> : paso.tono === "mal" ? <Icono nombre="cerrar" grosor={2.4} /> : <span className="vl-dot" aria-hidden="true" />}
            <span>{paso.etiqueta}</span>
            <code className={paso.mono ? "mono" : undefined}>{paso.valor}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Detalle() {
  const { huella } = useParams();
  const { estado: estadoSesion, sesion, expirar } = useSesionTech();
  const navegar = useNavigate();
  const avisar = useToast();
  const [detalle, setDetalle] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [fase, setFase] = useState("cargando"); // cargando | listo
  const [escaneando, setEscaneando] = useState(false);
  const [verificadaAhora, setVerificadaAhora] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [copia, setCopia] = useState("");
  const [firma, despachar] = useReducer(signingReducer, initialSigningState);
  const panel = useRef(null);
  const cuenta = sesion?.publicKey;

  useEffect(() => {
    document.title = `${td.titulo} · ${textos.marca}`;
  }, []);

  useEffect(() => {
    let activo = true;
    setFase("cargando");
    setErrorCarga("");
    setVerificadaAhora(false);
    setConfirmando(false);
    despachar({ type: "RESET" });
    leerDetalle(huella)
      .then((d) => {
        if (!activo) return;
        setDetalle(d);
        setFase("listo");
      })
      .catch((fallo) => {
        if (!activo) return;
        if (fallo?.status === 401 || fallo?.codigo === "no_autenticado") {
          expirar();
          return;
        }
        setErrorCarga(fallo?.codigo === "no-existe" ? "noExiste" : "noExiste");
      });
    return () => {
      activo = false;
    };
  }, [huella, expirar]);

  // Cerrar la confirmación sin revocar devuelve el foco al botón que la abrió (práctica de diálogo).
  const cerrarConfirmacion = useCallback(() => {
    despachar({ type: "RESET" });
    setConfirmando(false);
    requestAnimationFrame(() => document.querySelector(".btn-rev")?.focus());
  }, []);

  // El panel de confirmación es modal (alertdialog): atrapa el Tab mientras está abierto y Escape cancela
  // (salvo durante la firma, que no se interrumpe). Al abrir, el foco entra en el panel.
  useEffect(() => {
    if (!confirmando) return undefined;
    const nodo = panel.current;
    nodo?.focus();
    const alTeclear = (evento) => {
      if (!nodo) return;
      if (evento.key === "Escape" && !EN_CURSO.includes(firma.status)) {
        cerrarConfirmacion();
        return;
      }
      if (evento.key !== "Tab") return;
      const focos = [...nodo.querySelectorAll("button:not([disabled])")];
      if (focos.length === 0) {
        evento.preventDefault();
        nodo.focus();
        return;
      }
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (!nodo.contains(document.activeElement)) {
        evento.preventDefault();
        primero.focus();
      } else if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, [confirmando, firma.status, cerrarConfirmacion]);

  useEffect(() => {
    if (firma.status === "error" && firma.error?.kind === "unauthorized") expirar();
  }, [firma, expirar]);

  // Revocación confirmada: se muestra "revocada" de inmediato y se refresca con lo que lea el servidor.
  useEffect(() => {
    if (firma.status !== "confirmado") return undefined;
    setConfirmando(false);
    setVerificadaAhora(false);
    setDetalle(marcarRevocada);
    const tx = firma.result?.txId ? enlaceTransaccion(firma.result.txId) : "";
    avisar({ clave: "revocar", tono: "ok", texto: td.revocada, ...(tx ? { accion: { texto: td.verTx, alPulsar: () => window.open(tx, "_blank", "noopener") } } : {}) });
    let activo = true;
    recargarTrasRevocar(huella).then((d) => activo && d && setDetalle(d));
    return () => {
      activo = false;
    };
  }, [firma, huella, avisar]);

  const verificar = useCallback(async () => {
    if (escaneando) return;
    setEscaneando(true);
    setVerificadaAhora(false);
    try {
      const fresco = await leerDetalle(huella);
      setDetalle(fresco);
      if (fresco.estado === "sinComprobar") {
        avisar({ clave: "verificar", tono: "error", texto: fresco.motivo === "limite" ? td.estados.sinComprobarLimite : fresco.motivo === "conexion" ? td.estados.sinComprobarConexion : td.estados.sinComprobar });
      } else {
        setVerificadaAhora(true);
      }
    } finally {
      setEscaneando(false);
    }
  }, [huella, escaneando, avisar]);

  const revocar = useCallback(() => {
    runSigning({ kind: "revoke", input: { huella }, address: cuenta, dispatch: despachar, api: panelApi, wallet });
  }, [huella, cuenta]);

  const copiar = useCallback((clave, valor) => {
    try {
      navigator.clipboard?.writeText(valor).catch(() => {});
    } catch {
      /* sin portapapeles: no pasa nada */
    }
    setCopia(clave);
    setTimeout(() => setCopia((c) => (c === clave ? "" : c)), 1500);
  }, []);

  const volver = (
    <button type="button" className="back" onClick={() => navegar("/panel/credenciales")}>
      <Icono nombre="flecha" grosor={2} className="back-ic" />
      {td.volver}
    </button>
  );

  if (estadoSesion !== "dentro" && estadoSesion !== undefined) {
    // Sin sesión el detalle no tiene datos: se envía a la verificación pública, que no necesita cuenta.
    return (
      <>
        {volver}
        <p className="r-estado">
          <Link className="btn btn-green" to={`/verificar/${huella}`}>
            {td.verVerificacion}
          </Link>
        </p>
      </>
    );
  }

  if (errorCarga) {
    return (
      <>
        {volver}
        <div className="page-head rise">
          <h1 className="h1">{td.titulo}</h1>
        </div>
        <div className="r-estado" role="alert">
          <p>{td.noExiste}</p>
          <Link className="btn btn-line btn-sm" to="/panel/credenciales">
            {td.volver}
          </Link>
        </div>
      </>
    );
  }

  if (fase === "cargando" || !detalle) {
    return (
      <>
        {volver}
        <p className="r-estado" role="status">
          <span className="spin" aria-hidden="true" /> {td.cargando}
        </p>
      </>
    );
  }

  const confirmada = detalle.estado === "valida" || detalle.estado === "revocada";
  const revocable = esRevocable(detalle);
  const enCurso = EN_CURSO.includes(firma.status);
  const curso = detalle.curso || (detalle.estado === "noConfirmada" ? td.sinDatosTitulo : td.titulo);

  return (
    <>
      {volver}
      <div className="page-head rise" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="h1">{td.titulo}</h1>
          <p className="lede">{td.lema}</p>
        </div>
        <div className="d-actions">
          <button type="button" className="btn btn-green" onClick={verificar} disabled={escaneando} aria-busy={escaneando || undefined} aria-label={td.verificarAria}>
            {escaneando ? <span className="spin" aria-hidden="true" /> : <Icono nombre="escudo" grosor={2} />}
            {escaneando ? td.verificando : td.verificar}
          </button>
          {revocable && (
            <button type="button" className="btn btn-line btn-rev" onClick={() => setConfirmando(true)}>
              <Icono nombre="revocada" grosor={1.9} />
              {td.revocar}
            </button>
          )}
        </div>
      </div>

      <div className="dgrid">
        <div>
          <section className="card pad rise" style={{ animationDelay: "120ms" }} aria-labelledby="d-t">
            <div className="d-head">
              <h2 className="d-title" id="d-t">{curso}</h2>
              <Pill estado={detalle.estado} className="d-pill" />
            </div>
            <p className="d-sub">{td.estados[detalle.estado]}</p>
            <dl className="facts">
              {detalle.institucion && (
                <div className="fact">
                  <span className="fact-ic" aria-hidden="true"><Icono nombre="instituciones" /></span>
                  <dt>{td.campos.institucion}</dt>
                  <dd>{detalle.institucion}</dd>
                </div>
              )}
              {detalle.fecha && (
                <div className="fact">
                  <span className="fact-ic" aria-hidden="true"><Icono nombre="documento" /></span>
                  <dt>{td.campos.fecha}</dt>
                  <dd className="num">{fechaLarga(detalle.fecha)}</dd>
                </div>
              )}
              <div className="fact">
                <span className="fact-ic" aria-hidden="true"><Icono nombre="credenciales" /></span>
                <dt>{td.campos.codigo}</dt>
                <dd>
                  <span className="mono">{huellaCorta(detalle.huella)}</span>
                  <button className="copy" type="button" onClick={() => copiar("codigo", detalle.huella)} aria-label={td.copiarCodigo}>
                    <Icono nombre="credenciales" grosor={2} />
                    {copia === "codigo" ? td.copiado : td.copiar}
                  </button>
                </dd>
              </div>
            </dl>
          </section>

          <div className="two">
            {sesion?.institutionDid && (
              <section className="card pad rise" style={{ animationDelay: "200ms" }} aria-labelledby="did-t">
                <h3 className="h2" id="did-t">{td.identidadTitulo}</h3>
                <div className="did-box">
                  <span className="mono did-val">{sesion.institutionDid}</span>
                  <button className="copy" type="button" onClick={() => copiar("did", sesion.institutionDid)} aria-label={td.copiarId}>
                    {copia === "did" ? td.copiado : td.copiar}
                  </button>
                </div>
                <p className="did-exp">{td.identidadTexto}</p>
                {cuenta && (
                  <a className="ext" href={`https://stellar.expert/explorer/testnet/account/${cuenta}`} target="_blank" rel="noopener noreferrer">
                    {td.verExplorador}
                    <Icono nombre="flecha" grosor={2} className="ext-ic" />
                  </a>
                )}
              </section>
            )}
            <section className="card pad rise" style={{ animationDelay: "260ms" }} aria-labelledby="meta-t">
              <h3 className="h2" id="meta-t">{td.metaTitulo}</h3>
              <dl className="kv">
                <div>
                  <dt>{td.metaFirma}</dt>
                  <dd>
                    {detalle.estado === "noConfirmada" ? (
                      <span className="mal-line">{td.metaFirmaNo}</span>
                    ) : (
                      <span className="okline"><Icono nombre="check" grosor={2.4} />{td.metaFirmaOk}</span>
                    )}
                  </dd>
                </div>
                {cuenta && (
                  <div>
                    <dt>{td.metaCuenta}</dt>
                    <dd className="mono">{cuentaCorta(cuenta)}</dd>
                  </div>
                )}
                <div>
                  <dt>{td.metaRed}</dt>
                  <dd>{td.red}</dd>
                </div>
              </dl>
            </section>
          </div>

          <Registro detalle={detalle} cuenta={cuenta} enCurso={escaneando} />

          {confirmando && revocable && (
            <div className="revpanel" role="alertdialog" aria-modal="true" aria-labelledby="rev-t" aria-describedby="rev-x" tabIndex={-1} ref={panel}>
              <p id="rev-t" className="rev-t">{td.revocarTitulo}</p>
              <p id="rev-x" className="rev-x">{td.revocarTexto}</p>
              {enCurso && (
                <p className="rev-estado" role="status">
                  <span className="spin" aria-hidden="true" />
                  {firma.status === "esperando-firma" ? td.firma.firmar : firma.status === "enviando" ? td.firma.enviando : td.firma.preparando}
                </p>
              )}
              {firma.status === "error" && (
                <p className="rev-error" role="alert">{mensajeDeError(firma.error)}</p>
              )}
              <div className="rev-acc">
                {(firma.status === "idle" || firma.status === "error") && (
                  <button type="button" className="btn btn-rev-solid btn-sm" onClick={revocar}>
                    {firma.status === "error" ? td.firma.reintentar : td.revocarConfirmar}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={cerrarConfirmacion} disabled={enCurso}>
                  {td.revocarCancelar}
                </button>
              </div>
            </div>
          )}

          {confirmada && (
            <div className="compartir rise" style={{ animationDelay: "320ms" }}>
              <label className="isearch comp-enlace">
                <span className="sr">{td.enlace}</span>
                <input type="text" readOnly value={detalle.enlace} />
              </label>
              <button type="button" className="btn btn-line btn-sm" onClick={() => copiar("enlace", detalle.enlace)}>
                {copia === "enlace" ? td.compartirCopiado : td.copiarEnlace}
              </button>
              <Link className="btn btn-ghost btn-sm" to={`/verificar/${detalle.huella}`}>
                {td.verVerificacion}
              </Link>
            </div>
          )}
        </div>

        {confirmada && (
          <div className="cert-col">
            <Certificado detalle={detalle} escaneando={escaneando} verificada={verificadaAhora} />
            <p className="cert-cap">
              <span>{td.representacion}</span>
              <span className="cert-cap-hint">{td.mueve}</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
