// Marco del panel tech: barra lateral nocturna, barra superior y zona de contenido.
import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import textos from "../../content/textos-panel.json";
import { prepararHuella } from "../../services/verificacion.js";
import { cuentaCorta } from "../../data/modelo.js";
import { conceptoActivo } from "../../data/concepto.js";
import { RUTAS_CONCEPTO } from "../rutas.js";
import { useSesionTech } from "../sesion.jsx";
import Icono from "../Iconos.jsx";
import logo from "../../assets/ui-tech/tech-logo-mark-dark.webp";
import shards from "../../assets/ui-tech/tech-shards.webp";

// Navegación del panel. Cada pantalla se suma aquí cuando se migra (Credenciales en la fase 3; Instituciones y
// Verificaciones, de concepto, solo con VITE_CONCEPTO=1). "Nueva credencial" y "Credenciales" abren aún las
// pantallas anteriores (con su lista completa y la sección de sospechosas) hasta que se migren.
const NAV = [
  { to: "/panel", texto: textos.nav.resumen, icono: "resumen", end: true },
  { to: "/panel/emitir", texto: textos.nav.emitir, icono: "mas" },
  { to: "/panel/credenciales", texto: textos.nav.credenciales, icono: "credenciales" },
];

function Buscador() {
  const navegar = useNavigate();
  const campo = useRef(null);
  const [texto, setTexto] = useState("");
  const [invalido, setInvalido] = useState(false);
  const idAyuda = useId();

  // Ctrl K (o Cmd K) lleva el foco al buscador desde cualquier parte del panel.
  useEffect(() => {
    const alTeclear = (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        campo.current?.focus();
        campo.current?.select();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  function buscar(evento) {
    evento.preventDefault();
    try {
      navegar(`/panel/credencial/${prepararHuella(texto)}`);
    } catch {
      setInvalido(true);
    }
  }

  return (
    <form className="search-wrap" role="search" onSubmit={buscar} noValidate>
      <label className="search">
        <Icono nombre="buscar" grosor={2} />
        <span className="sr">{textos.buscar.etiqueta}</span>
        <input
          ref={campo}
          type="search"
          placeholder={textos.buscar.placeholder}
          autoComplete="off"
          spellCheck="false"
          value={texto}
          aria-invalid={invalido ? "true" : undefined}
          aria-describedby={invalido ? idAyuda : undefined}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setInvalido(false);
          }}
        />
        <span className="kbd" aria-hidden="true">
          {textos.buscar.atajo}
        </span>
      </label>
      {invalido && (
        <p className="search-err swap" id={idAyuda} role="alert">
          {textos.buscar.invalido}
        </p>
      )}
    </form>
  );
}

function MenuSesion() {
  const { estado, renovando, sesion, entrar, salir } = useSesionTech();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const boton = useRef(null);
  const idMenu = useId();

  // Clic fuera o Escape cierran el menú; Escape devuelve el foco al botón.
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (evento) => !raiz.current?.contains(evento.target) && setAbierto(false);
    const tecla = (evento) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    // Si el foco sale del menú con Tab, el menú se cierra (no queda abierto encima del contenido).
    const foco = (evento) => !raiz.current?.contains(evento.target) && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    document.addEventListener("focusin", foco);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("focusin", foco);
    };
  }, [abierto]);

  if (estado === "comprobando" || estado === "sin-servicio") return null;

  if (estado !== "dentro") {
    const firmando = estado === "entrando";
    return (
      <button type="button" className="btn btn-green btn-entrar" onClick={entrar} disabled={firmando} aria-busy={firmando || undefined}>
        {firmando && <span className="spin spin-dark" aria-hidden="true" />}
        {firmando ? textos.sesion.entrando : textos.sesion.entrar}
      </button>
    );
  }

  const nombre = sesion.institutionName || textos.sesion.menu;
  return (
    <div className="menu-sesion" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className="user"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={() => setAbierto((v) => !v)}
        aria-busy={renovando || undefined}
      >
        <span className="user-ic" aria-hidden="true">
          <Icono nombre="instituciones" />
        </span>
        <span>
          <b>{nombre}</b>
          <small className="mono">{cuentaCorta(sesion.publicKey)}</small>
        </span>
        {renovando ? <span className="spin" aria-hidden="true" /> : <Icono nombre="abajo" grosor={2} />}
        {renovando && <span className="sr">{textos.sesion.renovando}</span>}
      </button>
      {abierto && (
        <div className="menu-pop swap" id={idMenu}>
          <p className="menu-t">{textos.sesion.menu}</p>
          <dl className="menu-kv">
            <div>
              <dt>{textos.sesion.cuenta}</dt>
              <dd className="mono">{sesion.publicKey}</dd>
            </div>
            <div>
              <dt>Red</dt>
              <dd>{textos.sesion.red}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn btn-line btn-sm menu-salir"
            onClick={() => {
              setAbierto(false);
              salir();
            }}
          >
            <Icono nombre="salir" />
            {textos.sesion.salir}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { estado } = useSesionTech();
  const concepto = conceptoActivo() && Object.keys(RUTAS_CONCEPTO).length > 0;

  // Entrar, salir o vencer la sesión reemplazan el control que tenía el foco: si el foco cae al <body>,
  // se lleva al contenido para que el teclado y los lectores de pantalla no vuelvan al inicio de la página.
  // Solo tras entrar o salir (no en la carga inicial, para no saltarse el enlace «Saltar al contenido»).
  const previo = useRef(estado);
  useEffect(() => {
    const venia = previo.current;
    previo.current = estado;
    if (venia !== "dentro" && venia !== "entrando" && venia !== "sin-servicio") return;
    if (document.activeElement === document.body) document.getElementById("contenido")?.focus({ preventScroll: true });
  }, [estado]);
  return (
    <>
      <a className="salto" href="#contenido">
        {textos.saltar}
      </a>
      <div className="app">
        <aside className="side">
          <Link className="logo" to="/panel">
            <img src={logo} alt="" width="36" height="36" />
            <span>{textos.marca}</span>
          </Link>
          <nav className="nav" aria-label={textos.nav.aria}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <Icono nombre={item.icono} />
                {item.texto}
              </NavLink>
            ))}
          </nav>
          <div className="side-card">
            <img src={shards} alt="" />
            <p>{textos.lema}</p>
          </div>
          <p className="demo">
            <span>
              <b>{textos.nota.red}</b> {textos.nota.texto}
              {concepto && <> {textos.nota.concepto}</>}
            </span>
          </p>
        </aside>

        <div className="main">
          <header className="topbar">
            <Buscador />
            <div className="tb-right">
              <MenuSesion />
            </div>
          </header>
          <main className="content" id="contenido" tabIndex={-1}>
            <p className="nota-movil">{textos.nota.movil}</p>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
