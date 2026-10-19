import { Keypair } from "@stellar/stellar-sdk";
import { decodeSignature } from "./session.js";

// Capa de firma del emisor (opción A, N2 c). La institución firma con su wallet un texto que lleva la huella,
// su DID y la fecha de emisión; esa firma viaja dentro del `vcData` y cualquiera puede comprobarla con la
// clave pública de la institución. Quien escriba directo en el vault de ACTA no puede producirla.
//
// El prefijo "SV1|" separa este uso del mensaje de entrada al panel ("stellar-verify login|..."): una firma de
// un uso nunca sirve para el otro.

export const PROOF_TYPE = "StellarSignMessageV1";

export function issuanceMessage({ huella, institutionDid, issueDate }) {
  return `SV1|${huella}|${institutionDid}|${issueDate}`;
}

// Firma en base64 canónico, o null si no tiene la forma de una firma Ed25519 (64 bytes).
export function normalizeSignature(signature) {
  const bytes = decodeSignature(signature);
  return bytes ? Buffer.from(bytes).toString("base64") : null;
}

// true solo si la firma es de INSTITUTION_PUBLIC_KEY sobre exactamente este texto (SEP-53).
export function verifyIssuanceSignature({ huella, issueDate, signature, config }) {
  const bytes = decodeSignature(signature);
  if (!bytes) return false;
  try {
    return Keypair.fromPublicKey(config.institutionPublicKey).verifyMessage(
      issuanceMessage({ huella, institutionDid: config.institutionDid, issueDate }),
      bytes,
    );
  } catch {
    return false;
  }
}
