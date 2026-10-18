// Máquina de estados de la pantalla de firma (un solo reductor, probado).
//   idle → simulando → esperando-firma → enviando → confirmado
//   y, desde cualquier paso en curso, → error (con un TxError). Desde error se puede volver a empezar:
//   "Intentar de nuevo" siempre vuelve a preparar (nunca reutiliza un XDR caducado).
// Acciones: START, PREPARED, SIGNED, CONFIRMED, FAILED, RESET.

export const ESTADO = Object.freeze({
  IDLE: "idle",
  SIMULANDO: "simulando",
  ESPERANDO_FIRMA: "esperando-firma",
  ENVIANDO: "enviando",
  CONFIRMADO: "confirmado",
  ERROR: "error",
});

export const initialSigningState = Object.freeze({
  status: ESTADO.IDLE,
  step: null,
  expiresAt: null,
  result: null,
  error: null,
});

const IN_PROGRESS = [ESTADO.SIMULANDO, ESTADO.ESPERANDO_FIRMA, ESTADO.ENVIANDO];

export function signingReducer(state, action) {
  switch (action.type) {
    case "START":
      if (state.status !== ESTADO.IDLE && state.status !== ESTADO.ERROR) return state;
      return { ...initialSigningState, status: ESTADO.SIMULANDO };

    case "PREPARED":
      if (state.status !== ESTADO.SIMULANDO) return state;
      // Hoy hay una sola firma (la transacción); la firma del mensaje de la huella llega con la capa del emisor.
      return { ...state, status: ESTADO.ESPERANDO_FIRMA, step: "transaccion", expiresAt: action.expiresAt ?? null };

    case "SIGNED":
      if (state.status !== ESTADO.ESPERANDO_FIRMA) return state;
      return { ...state, status: ESTADO.ENVIANDO, step: null };

    case "CONFIRMED":
      if (state.status !== ESTADO.ENVIANDO) return state;
      return { ...state, status: ESTADO.CONFIRMADO, result: action.result ?? null };

    case "FAILED":
      if (!IN_PROGRESS.includes(state.status)) return state;
      return { ...state, status: ESTADO.ERROR, step: null, error: action.error };

    case "RESET":
      return initialSigningState;

    default:
      return state;
  }
}
