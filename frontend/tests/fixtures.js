// Datos de prueba compartidos. Las direcciones, DIDs y huellas de la institución de prueba son públicos
// (testnet). La llave de ACTA de aquí es falsa.

export const INSTITUTION_PUBLIC_KEY = "GAXUEDUKCI7V5MSQIHWT2DSUNUR73NRK6O2H7A7F4P2XD3QFKQUGQEQS";
export const INSTITUTION_DID = "did:stellar:testnet:srknm5lfj7btm5zrcgisjzrqxq";
export const INSTITUTION_KEY_MULTIBASE = "z6MkhdjdPeRxMctaDaQWYoyzJ7xM1b5KL8HuYFZGBsJ2ard5";

export const FOREIGN_PUBLIC_KEY = "GBBO6CQOPNSVSFAUVHJDRBGZVQLBXKWZQVZEFRC26HPE6K7B44EJRKRB";
export const FOREIGN_DID = "did:stellar:testnet:yz4pyieowctjs23tsgkvxgk4ua";
export const FOREIGN_KEY_MULTIBASE = "z6MkixYMtwqDtir76x3D8aazkfvEhwzFntKxF4JpqqJKqrij";

export const VAULT_ADDRESS = "CABXSPQQ32TS74EM52DGAQLXCWZWYPRECUJ5C2BN3G6GWTH4PU3TPI7W";
export const REGISTRY_ID = "CAJQFHGAJR5Q2NMGM7IYGM2KK6FLQXT634XZMGEYKKOYN2E2ONCFRSQK";
export const OLD_REGISTRY_ID = "CB7ATU7SF5QUKJMSULJDJVWJZVDXC23HTZX6NFUDTSFPVT6MA575NNZJ";

// Huellas: S1 (revocada), S5 (emisor ajeno) y una cualquiera.
export const HUELLA_REVOKED = "a1bd653d912a99b48548eb533b1ffc018acfc7e8e518e5402595395f1a18ae8f";
export const HUELLA_FOREIGN = "dc7927d17525f9a62714d02f3454fd40596ba54aa0789393c90717c0c998c0c9";
export const HUELLA_VALID = "35c3ae06a035b9104a266627d746772f466b4a9764d5738858d5c5cde8c06956";

export const ENV = Object.freeze({
  ACTA_API_BASE: "https://sandbox-api.acta.build",
  ACTA_API_KEY: "0".repeat(64),
  DID_RESOLVER_BASE: "https://did.acta.build",
  INSTITUTION_PUBLIC_KEY,
  INSTITUTION_DID,
  INSTITUTION_NAME: "Institucion de prueba",
  SIGNATURE_LAYER: "off",
  SESSION_SECRET: "secreto-de-sesion-solo-para-pruebas-0123456789",
});

export const CONFIG = Object.freeze({
  actaApiBase: ENV.ACTA_API_BASE,
  actaApiKey: ENV.ACTA_API_KEY,
  didResolverBase: ENV.DID_RESOLVER_BASE,
  stellarRpcUrl: "https://soroban-testnet.stellar.org",
  institutionPublicKey: INSTITUTION_PUBLIC_KEY,
  institutionDid: INSTITUTION_DID,
  institutionName: ENV.INSTITUTION_NAME,
  signatureLayer: "off",
  session: "ok",
  sessionSecret: ENV.SESSION_SECRET,
});

// Lo que guarda un vcData de Stellar-Verify (texto JSON, como lo entrega ACTA).
export function storedData(overrides = {}) {
  const subject = {
    id: "urn:uuid:3a13cd79-f623-4fea-8a77-35cf8fe2240c",
    institution: "Institucion de prueba",
    course: "Curso de prueba",
    issueDate: "2026-10-16",
    ...overrides.subject,
  };
  const data = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "StellarVerifyCredential"],
    issuer: INSTITUTION_DID,
    credentialSubject: subject,
  };
  return JSON.stringify(data);
}

// Registro tal como lo devuelve provider.getCredential.
export function record(overrides = {}) {
  return {
    id: HUELLA_VALID,
    issuerDid: INSTITUTION_DID,
    issuanceContract: VAULT_ADDRESS,
    data: JSON.parse(storedData()),
    ...overrides,
  };
}

// GET https://did.acta.build/health, tal como respondió el 18 oct 2026 (datos públicos).
export const RESOLVER_HEALTH = Object.freeze({
  status: "ok",
  service: "did-stellar-api",
  method: "did:stellar",
  networks: {
    testnet: REGISTRY_ID,
    mainnet: "CD6LSWW5ZSXOO5WAIHKQLQ262TW7BPI37PNEVMMA273BAPC65NN2AYXQ",
  },
  startedAt: "2026-09-21T17:43:33.787Z",
  index: {
    mode: "embedded",
    store: "postgres",
    ready: true,
    startError: null,
    warnings: [],
    networks: [
      { network: "testnet", configured: true, dids: 15, firstLedger: 5093492, lastLedger: 5252758, lastError: null },
      { network: "mainnet", configured: true, dids: 11, firstLedger: 64878129, lastLedger: 65000318, lastError: null },
    ],
  },
});

export const VAULT = Object.freeze({
  owner: INSTITUTION_PUBLIC_KEY,
  vaultAddress: VAULT_ADDRESS,
  didUri: INSTITUTION_DID,
  version: 1,
  vcCount: 2,
});

export function jsonReply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// fetch falso: asocia "MÉTODO ruta" con una respuesta (o una función) y guarda las llamadas.
export function createFakeFetch(routes) {
  const calls = [];
  async function fakeFetch(url, init = {}) {
    const { pathname } = new URL(url);
    const key = `${init.method ?? "GET"} ${pathname}`;
    calls.push({ key, url: String(url), headers: init.headers ?? {}, body: init.body ?? null });
    const route = routes[key];
    if (!route) return jsonReply(404, { error: "ruta_no_simulada" });
    return typeof route === "function" ? route({ url, init }) : route;
  }
  fakeFetch.calls = calls;
  return fakeFetch;
}
