// Cliente de la API propia (/api, mismo origen). La interfaz nunca habla con ACTA.
// La respuesta se traduce a las claves de estado que usan los textos y los sellos.

const UI_STATE = {
  valida: "valida",
  revocada: "revocada",
  no_encontrada: "noEncontrada",
  emisor_no_reconocido: "emisorNoReconocido",
  no_verificable: "noVerificable",
};

const MAX_FIELD_LENGTH = 200;

function failure(codigo) {
  const error = new Error(codigo);
  error.codigo = codigo;
  return error;
}

function textField(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_FIELD_LENGTH ? value : null;
}

// Cuando no hay respuesta confiable nunca se dice "no válida": solo que no se pudo comprobar.
function unverifiable(motivo = null) {
  return { estado: "noVerificable", ...(motivo ? { motivo } : {}) };
}

export async function fetchVerification(
  huella,
  { fetchImpl = (...args) => globalThis.fetch(...args), url = `/api/verify/${huella}` } = {},
) {
  let response;
  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" }, credentials: "same-origin" });
  } catch {
    return unverifiable();
  }
  if (response.status === 400) throw failure("huella-invalida");

  let body = null;
  try {
    body = await response.json();
  } catch {
    return unverifiable();
  }
  const estado = body && typeof body === "object" ? UI_STATE[body.estado] : undefined;
  if (!response.ok || !estado) return unverifiable();
  if (estado === "noVerificable") return unverifiable(body.motivo === "limite" ? "limite" : null);

  // Solo los estados confirmados traen datos de la credencial; en los demás se descarta todo lo que sobre,
  // porque un registro que no es de la institución no se muestra como propio.
  if (estado !== "valida" && estado !== "revocada") return { estado };

  const institucion = textField(body.institucion);
  const curso = textField(body.curso);
  const fecha = textField(body.fecha);
  if (!institucion || !curso || !fecha) return unverifiable();

  const revocadaEl = estado === "revocada" ? textField(body.revocadaEl) : null;
  return { estado, institucion, curso, fecha, ...(revocadaEl ? { revocadaEl } : {}) };
}

// Para las pantallas del panel (con sesión): lectura sin caché, igual que la verificación pública pero siempre fresca.
export function fetchPanelVerification(huella, options = {}) {
  return fetchVerification(huella, { ...options, url: `/api/panel/credential?huella=${huella}` });
}
