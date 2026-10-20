// Resumen del panel: solo cifras que salen del registro real. No hay base de datos ni registro de
// verificaciones, así que se muestra lo que hay en la bóveda y los estados de las credenciales más recientes.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import textos from "../../content/textos-panel.json";
import { contar, fechaCorta, huellaCorta, tipoDeFallo } from "../../data/modelo.js";
import { leerBoveda, leerCredencial } from "../../data/real.js";
import { useSesionTech } from "../sesion.jsx";
import { useToast } from "../componentes/Toast.jsx";
import { Pill, StatCard } from "../componentes/piezas.jsx";
import { mensajeDeError } from "../../components/FirmaEstado.jsx";
import Icono from "../Iconos.jsx";
import insignia from "../../assets/ui-tech/ins-curso.webp";
import montanas from "../../assets/ui-tech/montanas.webp";
import logo from "../../assets/ui-tech/tech-logo-mark-dark.webp";
import "../estilos/resumen.css";

const t = textos.resumen;
const RECIENTES = 4;

function Cifras({ lista }) {
  const cuenta = lista ? contar(lista.filas) : null;
  const n = lista?.filas.length ?? 0;
  // Sin lista no hay cifra («De las más recientes»); con la bóveda vacía, «Sin credenciales todavía».
  // Lo que no se pudo comprobar se dice en el subtítulo: nunca desaparece de la cuenta.
  const sub = (texto) => {
    if (!lista) return texto.replace("{n} ", "");
    if (n === 0) return t.stats.vacia;
    const extra = cuenta.sinComprobar > 0 ? t.stats.sinComprobar.replace("{n}", String(cuenta.sinComprobar)) : "";
    return texto.replace("{n}", String(n)) + extra;
  };
  const cifras = [
    ["boveda", lista?.total ?? null, t.stats.boveda.label, t.stats.boveda.sub],
    ["validas", cuenta?.valida ?? null, t.stats.validas.label, sub(t.stats.validas.sub)],
    ["revocadas", cuenta?.revocada ?? null, t.stats.revocadas.label, sub(t.stats.revocadas.sub)],
    ["revisar", cuenta?.noConfirmada ?? null, t.stats.revisar.label, sub(t.stats.revisar.sub)],
  ];
  return (
    <div className="stats" style={{ marginTop: 18 }}>
      {cifras.map(([tipo, valor, label, subtexto], i) => (
        <StatCard key={tipo} tipo={tipo} valor={valor} label={label} sub={subtexto} retraso={80 + i * 50} />
      ))}
    </div>
  );
}

function tituloDe(fila) {
  if (fila.curso) return fila.curso;
  return fila.estado === "sinComprobar" ? t.sinLeer : t.sinDatos;
}

function FilaReciente({ fila, indice, verificacion, ocupado, alVerificar }) {
  const titulo = tituloDe(fila);
  const verificando = verificacion?.estado === "verificando";
  const comprobada = verificacion && !verificando ? verificacion : null;
  // Tras verificar, la línea de estado muestra el resultado de ahora (no se mezcla con el de la lista). Si ahora
  // no se pudo comprobar, se conserva el estado conocido de la lista y se dice que no se pudo comprobar.
  const sinRespuesta = comprobada?.estado === "sinComprobar";
  const confirmada = comprobada && !sinRespuesta ? comprobada : null;
  const estadoMostrado = confirmada ? confirmada.estado : fila.estado;
  const fecha = confirmada ? confirmada.fecha ?? fila.fecha : fila.fecha;
  const puedeVerificar = fila.huellaEstandar && (!comprobada || sinRespuesta);
  return (
    <li className="rise" style={{ animationDelay: `${260 + indice * 60}ms` }}>
      {fila.estado === "noConfirmada" ? (
        <span className="r-alerta" aria-hidden="true">
          <Icono nombre="alerta" />
        </span>
      ) : (
        <img src={insignia} alt="" width="52" height="52" className={fila.estado === "revocada" ? "r-ins-rev" : undefined} />
      )}
      <div className="r-main">
        <p className="r-name">
          {fila.huellaEstandar ? (
            <Link className="r-link" to={`/panel/credencial/${fila.huella}`}>
              {titulo}
            </Link>
          ) : (
            titulo
          )}
        </p>
        <p className="r-sub mono">{t.codigo.replace("{codigo}", huellaCorta(fila.huella))}</p>
        <p className="r-meta num">
          {confirmada && <span className="r-ahora">{t.ahora}: </span>}
          {textos.estados[estadoMostrado]}
          {fecha && ` · ${fechaCorta(fecha)}`}
          {sinRespuesta && <span className="r-ahora"> · {t.noAhora}</span>}
        </p>
      </div>
      {puedeVerificar ? (
        // El mismo botón sigue montado mientras verifica (aria-disabled), así el foco del teclado no se pierde.
        <button
          type="button"
          className="btn btn-line btn-sm vbtn"
          data-huella={fila.huella}
          onClick={() => !verificando && alVerificar(fila)}
          disabled={ocupado && !verificando}
          aria-disabled={verificando || undefined}
          aria-label={verificando ? undefined : comprobada ? `${textos.verificar.otraVez}: ${titulo}` : textos.verificar.aria.replace("{curso}", titulo)}
        >
          {verificando && <span className="spin" aria-hidden="true" />}
          {verificando ? textos.verificar.verificando : comprobada ? textos.verificar.otraVez : textos.verificar.boton}
        </button>
      ) : (
        comprobada && <Pill estado={comprobada.estado} className="swap r-pill" tabIndex={-1} data-resultado={fila.huella} />
      )}
    </li>
  );
}

function Recientes({ lista, estadoLectura, alActualizar, limiteEn }) {
  const avisar = useToast();
  const { expirar } = useSesionTech();
  const [verificaciones, setVerificaciones] = useState({});
  const [anuncio, setAnuncio] = useState("");
  const titulo = useRef(null);
  const ocupado = Object.values(verificaciones).some((v) => v.estado === "verificando");

  // Una verificación a la vez: cada una cuesta unas 2 consultas a ACTA.
  const verificar = useCallback(
    async (fila) => {
      setVerificaciones((v) => ({ ...v, [fila.huella]: { estado: "verificando" } }));
      let resultado = { huella: fila.huella, estado: "sinComprobar", motivo: null };
      try {
        resultado = await leerCredencial(fila.huella);
      } catch (fallo) {
        const tipo = tipoDeFallo(fallo);
        if (tipo === "sesion") {
          expirar();
          return;
        }
        // Un error que no viene de la API es de programación: se registra para no confundirlo con una caída de ACTA.
        if (!Number.isInteger(fallo?.status)) console.error(fallo);
        if (tipo === "conexion") resultado = { ...resultado, motivo: "conexion" };
      } finally {
        setVerificaciones((v) => ({ ...v, [fila.huella]: resultado }));
      }
      setAnuncio(textos.verificar.anuncio.replace("{curso}", tituloDe(fila)).replace("{estado}", textos.estados[resultado.estado]));
      if (resultado.estado === "sinComprobar") {
        const texto = resultado.motivo === "limite" ? textos.verificar.limite : resultado.motivo === "conexion" ? textos.verificar.conexion : textos.verificar.fallo;
        avisar({ clave: "verificar", tono: "error", texto });
      } else {
        // El botón se reemplaza por el sello del resultado: el foco pasa al sello para no caer al inicio de la página.
        requestAnimationFrame(() => {
          if (document.activeElement === document.body || document.activeElement?.dataset?.huella === fila.huella) {
            document.querySelector(`[data-resultado="${fila.huella}"]`)?.focus();
          }
        });
      }
    },
    [avisar, expirar],
  );

  useEffect(() => {
    if (estadoLectura?.tipo === "sesion") expirar();
  }, [estadoLectura, expirar]);

  // Al terminar una lectura pedida con «Actualizar» o «Intentar de nuevo», el foco vuelve al título de la sección;
  // si vuelve a fallar, al aviso de error (el botón pulsado ya no existe).
  const pedida = useRef(false);
  const alerta = useRef(null);
  useEffect(() => {
    if (!pedida.current || estadoLectura?.tipo === "cargando") return;
    const fallo = estadoLectura && estadoLectura.tipo !== "sesion";
    if (!fallo && !lista) return;
    pedida.current = false;
    if (!fallo) setVerificaciones({});
    if (document.activeElement === document.body) (fallo ? alerta.current : titulo.current)?.focus();
  }, [estadoLectura, lista]);

  // «Actualizar» se habilita un minuto después de cada lectura: cada una gasta unas 21 consultas a ACTA
  // (límite de unas 60 por minuto, compartido con la verificación pública).
  const [, refrescar] = useState(0);
  // También tras un «límite de consultas»: si no, «Intentar de nuevo» y «Actualizar» volverían a gastar cupo enseguida.
  const libreEn = Math.max(lista?.leidaEn ?? 0, limiteEn ?? 0) + 60_000;
  const enEspera = Date.now() < libreEn;
  useEffect(() => {
    if (!enEspera) return undefined;
    const temporizador = setTimeout(() => refrescar((n) => n + 1), libreEn - Date.now() + 50);
    return () => clearTimeout(temporizador);
  }, [enEspera, libreEn]);
  const actualizar = () => {
    pedida.current = true;
    alActualizar();
  };

  let cuerpo;
  if (estadoLectura?.tipo === "cargando") {
    cuerpo = (
      <p className="r-estado" role="status">
        <span className="spin" aria-hidden="true" />
        {t.cargando}
      </p>
    );
  } else if (estadoLectura && estadoLectura.tipo !== "sesion") {
    const mensaje = { limite: t.errorLimite, conexion: t.errorConexion }[estadoLectura.tipo] ?? t.errorServicio;
    cuerpo = (
      <div className="r-estado" role="alert" ref={alerta} tabIndex={-1}>
        <p>{mensaje}</p>
        {/* En espera tras un límite de consultas el botón sigue enfocable (aria-disabled), no disabled: así el
            teclado no pierde el foco y la espera se explica en texto visible. */}
        <button
          type="button"
          className="btn btn-line btn-sm"
          onClick={() => !enEspera && actualizar()}
          aria-disabled={enEspera || undefined}
          aria-describedby={enEspera ? "r-espera" : undefined}
        >
          {t.reintentar}
        </button>
        {enEspera && (
          <p className="r-espera" id="r-espera">
            {t.reintentarEspera}
          </p>
        )}
      </div>
    );
  } else if (lista && lista.filas.length === 0) {
    cuerpo = <p className="r-estado">{t.vacia}</p>;
  } else if (lista) {
    cuerpo = (
      <ul className="recent" style={{ marginTop: 6 }}>
        {lista.filas.slice(0, RECIENTES).map((fila, i) => (
          <FilaReciente
            key={fila.huella}
            fila={fila}
            indice={i}
            verificacion={verificaciones[fila.huella]}
            ocupado={ocupado}
            alVerificar={verificar}
          />
        ))}
      </ul>
    );
  }

  const hora = lista?.leidaEn ? new Date(lista.leidaEn).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" }) : null;
  return (
    <section className="card pad rise" style={{ animationDelay: "200ms" }} aria-labelledby="rec-t">
      <div className="r-head">
        <h2 className="h2" id="rec-t" ref={titulo} tabIndex={-1}>
          {t.recientes}
        </h2>
        <Link className="link" to="/panel/credenciales">
          {t.verTodas}
          <Icono nombre="flecha" grosor={2} />
        </Link>
      </div>
      {lista && hora && estadoLectura?.tipo !== "cargando" && (
        <p className="r-leida">
          <span>{t.leida.replace("{hora}", hora)}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={actualizar}
            disabled={ocupado || enEspera}
            title={enEspera ? t.actualizarEspera : undefined}
          >
            {t.actualizar}
          </button>
        </p>
      )}
      {cuerpo}
      <p className="sr" aria-live="polite">
        {anuncio}
      </p>
    </section>
  );
}

function Entrar() {
  const { estado, error, aviso, entrar } = useSesionTech();
  const firmando = estado === "entrando";
  return (
    <section className="card pad r-entrar rise" style={{ animationDelay: "120ms" }} aria-labelledby="entrar-t">
      <span className="stat-ic ic-green r-entrar-ic" aria-hidden="true">
        <Icono nombre="llave" />
      </span>
      <h2 className="h2" id="entrar-t">
        {t.entrar.titulo}
      </h2>
      <p className="r-entrar-p">{t.entrar.texto}</p>
      <div aria-live="polite" aria-atomic="true">
        {aviso && <p className="r-entrar-aviso">{aviso}</p>}
        {error && (
          <p className="r-entrar-error" role="alert">
            {mensajeDeError(error)}
          </p>
        )}
      </div>
      <button type="button" className="btn btn-green" onClick={entrar} disabled={firmando} aria-busy={firmando || undefined}>
        {firmando && <span className="spin spin-dark" aria-hidden="true" />}
        {firmando ? textos.sesion.entrando : textos.sesion.entrar}
      </button>
    </section>
  );
}

export default function Resumen() {
  const { estado, sesion, reintentar: reintentarSesion } = useSesionTech();
  const [lista, setLista] = useState(null);
  const [lectura, setLectura] = useState(null);
  const [intento, setIntento] = useState(0);
  const [limiteEn, setLimiteEn] = useState(0);

  useEffect(() => {
    document.title = `${t.titulo} · ${textos.marca}`;
  }, []);

  useEffect(() => {
    if (estado !== "dentro") {
      setLista(null);
      setLectura(null);
      return undefined;
    }
    let activo = true;
    setLectura({ tipo: "cargando" });
    leerBoveda({ usarMemoria: intento === 0 })
      .then((leida) => {
        if (!activo) return;
        setLista(leida);
        setLectura(null);
      })
      .catch((fallo) => {
        // Un error que no viene de la API es de programación: se registra, no se achaca al registro en silencio.
        if (!Number.isInteger(fallo?.status)) console.error(fallo);
        if (!activo) return;
        const tipo = tipoDeFallo(fallo);
        if (tipo === "limite") setLimiteEn(Date.now());
        setLectura({ tipo });
      });
    return () => {
      activo = false;
    };
  }, [estado, intento]);

  const dentro = estado === "dentro";
  return (
    <>
      <div className="page-head rise">
        <div>
          <h1 className="h1">{t.titulo}</h1>
          <p className="lede">{t.lema}</p>
        </div>
        {dentro && (
          <Link className="btn btn-green" to="/panel/emitir">
            <Icono nombre="mas" grosor={2.2} />
            {textos.nav.emitir}
          </Link>
        )}
      </div>
      <div className="scope rise" style={{ animationDelay: "60ms" }}>
        {dentro && (
          <span className="chip">
            <Icono nombre="instituciones" className="chip-ic" />
            {sesion.institutionName}
          </span>
        )}
        <span className="pill p-gold">{t.red}</span>
      </div>

      {estado === "comprobando" && (
        <p className="r-estado" role="status">
          <span className="spin" aria-hidden="true" />
          {textos.sesion.comprobando}
        </p>
      )}
      {estado === "sin-servicio" && (
        <div className="r-estado" role="alert">
          <p>{textos.sesion.sinServicio}</p>
          <button type="button" className="btn btn-line btn-sm" onClick={reintentarSesion}>
            {textos.sesion.reintentar}
          </button>
        </div>
      )}
      {dentro && <Cifras lista={lista} />}

      <div className="grid2" style={{ marginTop: 16 }}>
        {dentro ? (
          <Recientes lista={lista} estadoLectura={lectura} limiteEn={limiteEn} alActualizar={() => setIntento((n) => n + 1)} />
        ) : (
          (estado === "fuera" || estado === "entrando") && <Entrar />
        )}
        <section className="hero rise" style={{ animationDelay: "260ms" }} aria-labelledby="hero-t">
          <img src={montanas} alt="" />
          <div className="hero-in">
            <img src={logo} alt="" width="44" height="44" />
            <p className="hero-t" id="hero-t">
              {t.hero.titulo}
            </p>
            <p className="hero-s">{t.hero.texto}</p>
            <Link className="hero-go" to="/" aria-label={t.hero.ir}>
              <Icono nombre="flecha" grosor={2.4} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
