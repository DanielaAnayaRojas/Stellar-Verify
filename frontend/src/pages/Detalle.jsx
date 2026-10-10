import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import textos from "../content/textos.json";
import CampoCopiable from "../components/CampoCopiable.jsx";
import IconoEstado from "../components/IconoEstado.jsx";
import { cargarDetalle, revocar } from "../services/detalle.js";
import { formatearFecha } from "../services/formato.js";

export default function Detalle() {
  const { huella } = useParams();
  const [datos, setDatos] = useState(null);
  const [codigoError, setCodigoError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState("");
  const cuadroConfirmacion = useRef(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setCodigoError("");
    setAviso("");
    setConfirmando(false);
    cargarDetalle(huella)
      .then((cargado) => vigente && setDatos(cargado))
      .catch((error) => vigente && setCodigoError(error.codigo || "no-existe"));
    return () => {
      vigente = false;
    };
  }, [huella]);

  useEffect(() => {
    if (confirmando && cuadroConfirmacion.current) cuadroConfirmacion.current.focus();
  }, [confirmando]);

  async function confirmarRevocacion() {
    setFallo("");
    setTrabajando(true);
    try {
      const actualizada = await revocar(datos.credencial.huella);
      setDatos((anterior) => ({ ...anterior, credencial: actualizada }));
      setAviso(`${textos.revocacion.avisoRevocada}. ${textos.revocacion.avisoDetalle}`);
      setConfirmando(false);
    } catch (error) {
      setFallo(error.message);
    }
    setTrabajando(false);
  }

  if (codigoError) {
    return (
      <section>
        <p className="error" role="alert">
          {textos.errores[codigoError]}
        </p>
        <Link className="boton" to="/panel">
          {textos.emision.volverLista}
        </Link>
      </section>
    );
  }

  if (!datos) {
    return (
      <section>
        <div className="carga" role="status">
          <div className="carga__barra" aria-hidden="true" />
          <p>{textos.verificar.consultando}</p>
        </div>
      </section>
    );
  }

  const { credencial, enlace, qr } = datos;
  const revocada = credencial.estado === "revocada";
  const estado = revocada ? "revocada" : "valida";

  return (
    <section aria-labelledby="titulo-detalle">
      <h1 id="titulo-detalle">{credencial.logro}</h1>
      <p className={`estado estado--${estado}`}>
        <IconoEstado estado={estado} tamano={20} />
        {textos.resultados[estado].sello}
      </p>

      <div aria-live="polite" aria-atomic="true">
        {aviso && <p className="aviso">{aviso}</p>}
        {fallo && (
          <p className="error" role="alert">
            {fallo}
          </p>
        )}
        {trabajando && (
          <div className="carga">
            <div className="carga__barra" aria-hidden="true" />
            <p>{textos.revocacion.revocando}</p>
          </div>
        )}
      </div>

      {revocada && (
        <p>
          {textos.resultados.revocada.explicacion.replace(
            "{fecha}",
            formatearFecha(credencial.fechaRevocacion)
          )}
        </p>
      )}

      <dl className="documento documento__campos documento__campos--solo">
        <div className="documento__campo">
          <dt>{textos.resultados.campos.institucion}</dt>
          <dd>
            {credencial.institucion
              ? `${credencial.institucion.nombre}, ${credencial.institucion.pais}`
              : ""}
          </dd>
        </div>
        <div className="documento__campo">
          <dt>{textos.resultados.campos.titular}</dt>
          <dd>{credencial.titular}</dd>
        </div>
        <div className="documento__campo">
          <dt>{textos.resultados.campos.fechaEmision}</dt>
          <dd>{formatearFecha(credencial.fechaEmision)}</dd>
        </div>
        <CampoCopiable
          etiqueta={textos.resultados.campos.huella}
          valor={credencial.huella}
          boton={textos.resultados.copiar}
          copiado={textos.resultados.copiada}
        />
        <CampoCopiable
          etiqueta={textos.emision.resultado.enlace}
          valor={enlace}
          boton={textos.emision.resultado.copiarEnlace}
          copiado={textos.emision.resultado.enlaceCopiado}
        />
      </dl>

      {qr && (
        <figure className="qr">
          <img
            src={qr}
            width="200"
            height="200"
            alt={textos.emision.resultado.qrAlt.replace("{titular}", credencial.titular)}
          />
          <figcaption>{textos.emision.resultado.qr}</figcaption>
        </figure>
      )}

      {confirmando && !revocada && (
        <div
          className="confirmacion"
          role="alertdialog"
          aria-labelledby="texto-confirmacion"
          tabIndex="-1"
          ref={cuadroConfirmacion}
        >
          <p id="texto-confirmacion">
            {textos.revocacion.confirmacion.replace("{titular}", credencial.titular)}
          </p>
          <div className="acciones">
            <button
              type="button"
              className="boton boton--peligro"
              onClick={confirmarRevocacion}
              disabled={trabajando}
            >
              {textos.revocacion.botonRevocar}
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => setConfirmando(false)}
              disabled={trabajando}
            >
              {textos.revocacion.cancelar}
            </button>
          </div>
        </div>
      )}

      {!confirmando && (
        <div className="acciones">
          {!revocada ? (
            <button
              type="button"
              className="boton boton--peligro"
              onClick={() => setConfirmando(true)}
            >
              {textos.revocacion.botonRevocar}
            </button>
          ) : (
            <Link className="boton" to={`/verificar/${credencial.huella}`}>
              {textos.emision.resultado.verVerificacion}
            </Link>
          )}
          {!revocada && (
            <Link className="boton boton--secundario" to={`/verificar/${credencial.huella}`}>
              {textos.emision.resultado.verVerificacion}
            </Link>
          )}
          <Link className="boton boton--secundario" to="/panel">
            {textos.emision.volverLista}
          </Link>
        </div>
      )}
    </section>
  );
}
