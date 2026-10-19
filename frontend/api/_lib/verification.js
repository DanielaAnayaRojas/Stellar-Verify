import { createTtlCache } from "./cache.js";
import { PROOF_TYPE, verifyIssuanceSignature } from "./issuerSignature.js";
import { logProviderError } from "./log.js";

// Verificación pública. Regla N2: "válida" solo si
//   (a) el issuer_did del registro es el DID de la institución, y
//   (b) el did_uri del vault es el DID de la institución, y
//   (c) con SIGNATURE_LAYER=on, la firma de la institución sobre huella + DID + fecha verifica.
// Cualquier otra combinación NO es "válida", aunque el registro esté revocado.
// Mientras no exista (c), quien escriba directo en la red puede copiar el issuer_did: el hueco queda
// cerrado solo cuando la capa de firma esté activa.

const RESULT_TTL_MS = 30 * 1000;
const VAULT_TTL_MS = 5 * 60 * 1000;
const MAX_TEXT_LENGTH = 120;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const ESTADOS = Object.freeze({
  VALIDA: "valida",
  REVOCADA: "revocada",
  NO_ENCONTRADA: "no_encontrada",
  EMISOR_NO_RECONOCIDO: "emisor_no_reconocido",
  NO_VERIFICABLE: "no_verificable",
});

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH || CONTROL_CHARACTERS.test(text)) return null;
  return text;
}

// Fecha como texto YYYY-MM-DD. Nunca se pasa por Date para mostrarla: corre un día por la zona horaria.
function cleanDate(value) {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  const real =
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return real ? value : null;
}

// Lee los datos visibles de una credencial con el formato de Stellar-Verify. null si el formato es ajeno.
function readSubject(data) {
  const subject = data.credentialSubject;
  if (!isObject(subject)) return null;
  const institution = cleanText(subject.institution);
  const course = cleanText(subject.course);
  const issueDate = cleanDate(subject.issueDate);
  if (!institution || !course || !issueDate) return null;
  return { institution, course, issueDate };
}

// Clasifica un registro que existe en el vault (valid o revoked). Función pura: se prueba con fixtures.
export function classifyCredential({ huella, status, credential, vault, config }) {
  const untrusted = { estado: ESTADOS.EMISOR_NO_RECONOCIDO };
  if (!credential || credential.data === null) return untrusted;
  if (credential.issuerDid !== config.institutionDid) return untrusted;
  if (!vault || vault.didUri !== config.institutionDid) return untrusted;

  const subject = readSubject(credential.data);
  if (!subject) return untrusted;

  // (c) Capa de firma: la institución firmó esta huella, su DID y esta fecha. Sin firma válida no es suya.
  if (config.signatureLayer === "on") {
    const proof = isObject(credential.data.proof) ? credential.data.proof : null;
    const signed =
      proof !== null &&
      proof.type === PROOF_TYPE &&
      verifyIssuanceSignature({ huella, issueDate: subject.issueDate, signature: proof.signature, config });
    if (!signed) return untrusted;
  }

  const visible = { institucion: subject.institution, curso: subject.course, fecha: subject.issueDate };
  if (status.status === "revoked") {
    // ACTA no entrega la fecha de revocación (medido): solo se muestra si algún día viene.
    const revokedOn = cleanDate(typeof status.since === "string" ? status.since.slice(0, 10) : null);
    return { estado: ESTADOS.REVOCADA, ...visible, ...(revokedOn ? { revocadaEl: revokedOn } : {}) };
  }
  return { estado: ESTADOS.VALIDA, ...visible };
}

export function createVerifier({ provider, config, onProviderError = logProviderError }) {
  const resultCache = createTtlCache({ ttlMs: RESULT_TTL_MS });
  const vaultCache = createTtlCache({ ttlMs: VAULT_TTL_MS });
  // El DID del vault casi nunca cambia: si ACTA no responde al renovarlo, se usa el último valor bueno conocido
  // en vez de decir "sin comprobar". Solo aplica a esta lectura; el estado de la credencial siempre es fresco.
  let lastKnownVault = null;
  async function loadVault() {
    try {
      lastKnownVault = await provider.getVaultInfo();
      return lastKnownVault;
    } catch (error) {
      if (lastKnownVault) return lastKnownVault;
      throw error;
    }
  }

  // Devuelve { result, recordStatus }: el resultado público y el estado crudo del registro ("valid", "revoked"...).
  async function inspect(huella) {
    let recordStatus = null;
    try {
      const status = await provider.getStatus(huella);
      recordStatus = status.status;
      if (status.status === "invalid") return { result: { estado: ESTADOS.NO_ENCONTRADA }, recordStatus };
      // "unknown" no permite afirmar nada: nunca se dice "no válida" sin saber.
      if (status.status !== "valid" && status.status !== "revoked") {
        return { result: { estado: ESTADOS.NO_VERIFICABLE }, recordStatus };
      }

      const [credential, vault] = await Promise.all([
        provider.getCredential(huella),
        vaultCache.getOrLoad("vault", loadVault),
      ]);
      // verify-vc dice que existe pero get-vc no lo entrega: inconsistente, no se afirma nada.
      if (!credential) return { result: { estado: ESTADOS.NO_VERIFICABLE }, recordStatus };

      return { result: classifyCredential({ huella, status, credential, vault, config }), recordStatus };
    } catch (error) {
      onProviderError(error);
      // Si ACTA limita las consultas, la pantalla lo dice (no es un caído): se pide esperar un minuto.
      const motivo = error && error.kind === "rate_limited" ? { motivo: "limite" } : {};
      return { result: { estado: ESTADOS.NO_VERIFICABLE, ...motivo }, recordStatus };
    }
  }

  async function compute(huella) {
    return (await inspect(huella)).result;
  }

  return {
    // Un fallo temporal no se guarda en caché: el siguiente intento vuelve a consultar.
    verify(huella) {
      return resultCache.getOrLoad(huella, () => compute(huella), {
        shouldCache: (result) => result.estado !== ESTADOS.NO_VERIFICABLE,
      });
    },
    // Lectura sin caché, para el panel: cada función de Vercel tiene su propia memoria, así que `forget` de una
    // no limpia la caché de otra. El panel siempre lee fresco y no deja guardado nada en la caché pública.
    verifyFresh(huella) {
      return compute(huella);
    },
    // Igual que verifyFresh, pero además dice si el registro está vigente o revocado (para la lista del panel).
    inspectFresh(huella) {
      return inspect(huella);
    },
    // Tras escribir (F2), la misma instancia deja de servir lo anterior.
    forget(huella) {
      resultCache.delete(huella);
      vaultCache.clear();
    },
  };
}
