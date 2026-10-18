import { StrKey } from "@stellar/stellar-sdk";

// Lee y valida las variables de entorno del servidor. Ninguna lleva el prefijo VITE_.
// Devuelve { ok: true, config } o { ok: false, problems }. Los problemas nombran la variable, nunca su valor.

const DID_PATTERN = /^did:stellar:testnet:[a-z0-9]{10,64}$/;
const MAX_NAME_LENGTH = 120;
const MIN_SESSION_SECRET_LENGTH = 32;
const DEFAULT_STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";

function readBaseUrl(value, { allowLocalHttp = false } = {}) {
  try {
    const url = new URL(value);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(allowLocalHttp && url.protocol === "http:" && isLocal)) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function loadConfig(env = process.env) {
  const problems = [];
  const text = (name) => String(env[name] ?? "").trim();

  const actaApiBase = readBaseUrl(text("ACTA_API_BASE"));
  if (!actaApiBase) problems.push("ACTA_API_BASE: falta o no es una dirección https válida");

  const didResolverBase = readBaseUrl(text("DID_RESOLVER_BASE"));
  if (!didResolverBase) problems.push("DID_RESOLVER_BASE: falta o no es una dirección https válida");

  // Opcional: por defecto, el RPC público de testnet de la Fundación Stellar.
  // Se admite http solo hacia esta misma máquina (un nodo local para pruebas); nunca hacia internet.
  const stellarRpcUrl = readBaseUrl(text("STELLAR_RPC_URL") || DEFAULT_STELLAR_RPC_URL, { allowLocalHttp: true });
  if (!stellarRpcUrl) problems.push("STELLAR_RPC_URL: no es una dirección https válida");

  const actaApiKey = text("ACTA_API_KEY");
  if (!actaApiKey) problems.push("ACTA_API_KEY: falta");

  const institutionPublicKey = text("INSTITUTION_PUBLIC_KEY");
  if (!StrKey.isValidEd25519PublicKey(institutionPublicKey)) {
    problems.push("INSTITUTION_PUBLIC_KEY: falta o no es una dirección Stellar pública (G...)");
  }

  const institutionDid = text("INSTITUTION_DID");
  if (!DID_PATTERN.test(institutionDid)) {
    problems.push("INSTITUTION_DID: falta o no es un did:stellar:testnet válido");
  }

  const institutionName = text("INSTITUTION_NAME");
  if (institutionName.length > MAX_NAME_LENGTH) {
    problems.push(`INSTITUTION_NAME: supera ${MAX_NAME_LENGTH} caracteres`);
  }

  // Capa de firma del emisor (opción A): con 'on', cada credencial lleva la firma de la institución y la
  // verificación la exige; con 'off' (por defecto) solo rige la regla del emisor y del vault.
  const signatureLayer = text("SIGNATURE_LAYER").toLowerCase() || "off";
  if (signatureLayer !== "on" && signatureLayer !== "off") {
    problems.push("SIGNATURE_LAYER: debe ser 'on' u 'off'");
  }

  // El secreto de sesión solo afecta al panel: sin él, la verificación pública sigue funcionando.
  const sessionSecretValue = text("SESSION_SECRET");
  let session = "ok";
  if (!sessionSecretValue) session = "missing";
  else if (sessionSecretValue.length < MIN_SESSION_SECRET_LENGTH) session = "too_short";

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    config: Object.freeze({
      actaApiBase,
      actaApiKey,
      didResolverBase,
      stellarRpcUrl,
      institutionPublicKey,
      institutionDid,
      institutionName,
      signatureLayer,
      session,
      sessionSecret: session === "ok" ? sessionSecretValue : null,
    }),
  };
}
