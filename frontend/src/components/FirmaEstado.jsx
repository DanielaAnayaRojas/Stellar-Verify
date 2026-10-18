import textos from "../content/textos.json";
import { enlaceTransaccion } from "../services/emision.js";

const EN_CURSO = ["simulando", "esperando-firma", "enviando"];

// Texto de un TxError. Si el fallo trae un código de seguimiento, se muestra donde el texto lo pide.
export function mensajeDeError(error) {
  const plantilla = textos.firma.errores[error.messageKey] || textos.firma.errores.unknown;
  return plantilla.replace("{request_id}", error.requestId || "sin código");
}

// Muestra el estado de una operación firmada: avisos que leen los lectores de pantalla, error con
// reintento (que vuelve a preparar) y, si la operación ya salió, el enlace a la transacción.
export default function FirmaEstado({ estado, alReintentar }) {
  const enCurso = EN_CURSO.includes(estado.status);
  const error = estado.status === "error" ? estado.error : null;
  const enlace = error && error.txId ? enlaceTransaccion(error.txId) : "";

  return (
    <div aria-live="polite" aria-atomic="true">
      {enCurso && (
        <div className="carga" role="status">
          <div className="carga__barra" aria-hidden="true" />
          <p>{textos.firma.estados[estado.status]}</p>
        </div>
      )}

      {error && (
        <div role="alert">
          <p className="error">{mensajeDeError(error)}</p>
          {enlace && (
            <p>
              <a href={enlace} target="_blank" rel="noreferrer">
                {textos.firma.verTransaccion}
              </a>
            </p>
          )}
          {error.retryable && alReintentar && (
            <button type="button" className="boton" onClick={alReintentar}>
              {textos.firma.reintentar}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
