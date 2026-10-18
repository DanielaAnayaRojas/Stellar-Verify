import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProviderError } from "../../api/_lib/errors.js";
import { classifyCredential, createVerifier } from "../../api/_lib/verification.js";
import {
  CONFIG,
  FOREIGN_DID,
  HUELLA_FOREIGN,
  HUELLA_REVOKED,
  HUELLA_VALID,
  VAULT,
  record,
  storedData,
} from "../fixtures.js";

// Proveedor falso: cada método devuelve lo configurado o lanza el error indicado, y cuenta sus llamadas.
function fakeProvider({ status, credential, vault = VAULT } = {}) {
  const calls = { getStatus: 0, getCredential: 0, getVaultInfo: 0 };
  const answer = (name, value) => async () => {
    calls[name] += 1;
    if (value instanceof Error) throw value;
    return typeof value === "function" ? value() : value;
  };
  return {
    calls,
    getStatus: answer("getStatus", status),
    getCredential: answer("getCredential", credential),
    getVaultInfo: answer("getVaultInfo", vault),
  };
}

function verifierFor(provider) {
  const errors = [];
  const verifier = createVerifier({ provider, config: CONFIG, onProviderError: (error) => errors.push(error) });
  return { verifier, errors };
}

describe("regla N2 (clasificación de un registro que existe)", () => {
  const valid = { status: "valid" };

  it("válida: muestra institución, curso y fecha", () => {
    const result = classifyCredential({ status: valid, credential: record(), vault: VAULT, config: CONFIG });
    assert.deepEqual(result, {
      estado: "valida",
      institucion: "Institucion de prueba",
      curso: "Curso de prueba",
      fecha: "2026-10-16",
    });
  });

  it("la fecha se entrega como texto, sin pasar por Date (no se corre un día)", () => {
    const result = classifyCredential({
      status: valid,
      credential: record({ data: JSON.parse(storedData({ subject: { issueDate: "2026-01-01" } })) }),
      vault: VAULT,
      config: CONFIG,
    });
    assert.equal(result.fecha, "2026-01-01");
  });

  it("revocada: sin fecha de revocación cuando ACTA no la entrega", () => {
    const result = classifyCredential({ status: { status: "revoked" }, credential: record(), vault: VAULT, config: CONFIG });
    assert.equal(result.estado, "revocada");
    assert.equal("revocadaEl" in result, false);
  });

  it("revocada: usa la fecha si algún día llega en `since`", () => {
    const result = classifyCredential({
      status: { status: "revoked", since: "2026-10-17T18:17:47Z" },
      credential: record(),
      vault: VAULT,
      config: CONFIG,
    });
    assert.equal(result.revocadaEl, "2026-10-17");
  });

  it("emisor ajeno: otro issuer_did", () => {
    const result = classifyCredential({
      status: valid,
      credential: record({ issuerDid: FOREIGN_DID }),
      vault: VAULT,
      config: CONFIG,
    });
    assert.deepEqual(result, { estado: "emisor_no_reconocido" });
  });

  it("emisor ajeno y revocada: sigue siendo emisor no reconocido (caso S5b)", () => {
    const result = classifyCredential({
      status: { status: "revoked" },
      credential: record({ issuerDid: FOREIGN_DID }),
      vault: VAULT,
      config: CONFIG,
    });
    assert.deepEqual(result, { estado: "emisor_no_reconocido" });
  });

  it("el did_uri del vault no es el de la institución (o falta)", () => {
    for (const didUri of [FOREIGN_DID, "did:stellar:testnet:otro", null]) {
      const result = classifyCredential({
        status: valid,
        credential: record(),
        vault: { ...VAULT, didUri },
        config: CONFIG,
      });
      assert.equal(result.estado, "emisor_no_reconocido");
    }
  });

  it("data rota o sin issuer_did", () => {
    assert.equal(
      classifyCredential({ status: valid, credential: record({ data: null }), vault: VAULT, config: CONFIG }).estado,
      "emisor_no_reconocido",
    );
    assert.equal(
      classifyCredential({ status: valid, credential: record({ issuerDid: null }), vault: VAULT, config: CONFIG }).estado,
      "emisor_no_reconocido",
    );
  });

  it("formato ajeno: sujeto ausente, fecha imposible, texto con control o demasiado largo", () => {
    const hostile = [
      { ...JSON.parse(storedData()), credentialSubject: "texto" },
      { ...JSON.parse(storedData()), credentialSubject: null },
      JSON.parse(storedData({ subject: { issueDate: "2026-02-31" } })),
      JSON.parse(storedData({ subject: { issueDate: "16/10/2026" } })),
      JSON.parse(storedData({ subject: { course: "Curso\u0000raro" } })),
      JSON.parse(storedData({ subject: { course: "x".repeat(121) } })),
      JSON.parse(storedData({ subject: { institution: "" } })),
      JSON.parse(storedData({ subject: { course: 42 } })),
    ];
    for (const data of hostile) {
      const result = classifyCredential({ status: valid, credential: record({ data }), vault: VAULT, config: CONFIG });
      assert.deepEqual(result, { estado: "emisor_no_reconocido" });
    }
  });

  it("un registro no confiable nunca deja salir institución, curso ni fecha", () => {
    const result = classifyCredential({
      status: valid,
      credential: record({ issuerDid: FOREIGN_DID }),
      vault: VAULT,
      config: CONFIG,
    });
    assert.deepEqual(Object.keys(result), ["estado"]);
  });
});

describe("verificación pública (los 5 estados)", () => {
  it("válida", async () => {
    const { verifier } = verifierFor(fakeProvider({ status: { status: "valid" }, credential: record() }));
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "valida");
  });

  it("revocada", async () => {
    const { verifier } = verifierFor(fakeProvider({ status: { status: "revoked" }, credential: record() }));
    assert.equal((await verifier.verify(HUELLA_REVOKED)).estado, "revocada");
  });

  it("verifyFresh lee siempre de ACTA, sin usar ni llenar la caché pública", async () => {
    let status = { status: "invalid" };
    const provider = fakeProvider({ status: () => status, credential: record() });
    const { verifier } = verifierFor(provider);

    assert.equal((await verifier.verifyFresh(HUELLA_VALID)).estado, "no_encontrada");
    assert.equal((await verifier.verifyFresh(HUELLA_VALID)).estado, "no_encontrada");
    assert.equal(provider.calls.getStatus, 2, "cada lectura fresca consulta a ACTA");

    // Lo escrito después se ve de inmediato en la lectura fresca, y la caché pública no quedó con el dato viejo.
    status = { status: "valid" };
    assert.equal((await verifier.verifyFresh(HUELLA_VALID)).estado, "valida");
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "valida", "la pública no heredó 'no encontrada'");
  });

  it("si ACTA no responde al renovar el vault, usa el último vault conocido en vez de 'sin comprobar'", async () => {
    let vaultCalls = 0;
    const provider = fakeProvider({ status: { status: "valid" }, credential: record() });
    provider.getVaultInfo = async () => {
      vaultCalls += 1;
      if (vaultCalls > 1) throw new Error("ACTA colgado");
      return VAULT;
    };
    const errors = [];
    const verifier = createVerifier({ provider, config: CONFIG, onProviderError: (error) => errors.push(error) });
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "valida", "primera lectura: el vault se lee bien");
    verifier.forget(HUELLA_VALID); // olvida resultado y vault, como al pasar el tiempo de la caché
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "valida", "con ACTA colgado usa el último vault conocido");
    assert.equal(vaultCalls, 2);
    assert.equal(errors.length, 0);
  });

  it("si nunca se pudo leer el vault, sigue siendo 'sin comprobar' (no se inventa nada)", async () => {
    const provider = fakeProvider({ status: { status: "valid" }, credential: record() });
    provider.getVaultInfo = async () => { throw new Error("ACTA colgado"); };
    const { verifier } = verifierFor(provider);
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "no_verificable");
  });

  it("no encontrada: no consulta el registro ni el vault", async () => {
    const provider = fakeProvider({ status: { status: "invalid" } });
    const { verifier } = verifierFor(provider);
    assert.deepEqual(await verifier.verify(HUELLA_VALID), { estado: "no_encontrada" });
    assert.equal(provider.calls.getCredential, 0);
    assert.equal(provider.calls.getVaultInfo, 0);
  });

  it("emisor no reconocido (credencial ajena)", async () => {
    const { verifier } = verifierFor(
      fakeProvider({ status: { status: "valid" }, credential: record({ issuerDid: FOREIGN_DID }) }),
    );
    assert.deepEqual(await verifier.verify(HUELLA_FOREIGN), { estado: "emisor_no_reconocido" });
  });

  it("no se pudo comprobar: servicio caído, límite de lecturas o llave inválida", async () => {
    for (const kind of ["unavailable", "rate_limited", "unauthorized", "wrong_network", "invalid_response"]) {
      const { verifier, errors } = verifierFor(fakeProvider({ status: new ProviderError(kind) }));
      assert.deepEqual(await verifier.verify(HUELLA_VALID), { estado: "no_verificable" });
      assert.equal(errors.length, 1);
      assert.equal(errors[0].kind, kind);
    }
  });

  it("no se pudo comprobar: el vault no responde aunque el registro sí", async () => {
    const { verifier } = verifierFor(
      fakeProvider({ status: { status: "valid" }, credential: record(), vault: new ProviderError("unavailable") }),
    );
    assert.deepEqual(await verifier.verify(HUELLA_VALID), { estado: "no_verificable" });
  });

  it("estado desconocido o registro inconsistente: no se afirma nada", async () => {
    const unknown = verifierFor(fakeProvider({ status: { status: "unknown" } }));
    assert.deepEqual(await unknown.verifier.verify(HUELLA_VALID), { estado: "no_verificable" });

    const inconsistent = verifierFor(fakeProvider({ status: { status: "valid" }, credential: null }));
    assert.deepEqual(await inconsistent.verifier.verify(HUELLA_VALID), { estado: "no_verificable" });
  });

  it("un error inesperado del código también termina en no_verificable", async () => {
    const { verifier, errors } = verifierFor(fakeProvider({ status: new TypeError("falla interna") }));
    assert.deepEqual(await verifier.verify(HUELLA_VALID), { estado: "no_verificable" });
    assert.equal(errors.length, 1);
  });
});

describe("caché de la verificación", () => {
  it("la misma huella no vuelve a consultar dentro de la ventana", async () => {
    const provider = fakeProvider({ status: { status: "valid" }, credential: record() });
    const { verifier } = verifierFor(provider);
    await verifier.verify(HUELLA_VALID);
    await verifier.verify(HUELLA_VALID);
    assert.equal(provider.calls.getStatus, 1);
  });

  it("el vault se consulta una vez para varias huellas", async () => {
    const provider = fakeProvider({ status: { status: "valid" }, credential: record() });
    const { verifier } = verifierFor(provider);
    await verifier.verify(HUELLA_VALID);
    await verifier.verify(HUELLA_REVOKED);
    assert.equal(provider.calls.getVaultInfo, 1);
  });

  it("un fallo temporal no se guarda: el siguiente intento vuelve a consultar", async () => {
    let first = true;
    const provider = fakeProvider({
      status: () => {
        if (first) {
          first = false;
          throw new ProviderError("unavailable");
        }
        return { status: "invalid" };
      },
    });
    const { verifier } = verifierFor(provider);
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "no_verificable");
    assert.equal((await verifier.verify(HUELLA_VALID)).estado, "no_encontrada");
  });

  it("forget deja de servir lo anterior (para después de emitir o revocar)", async () => {
    const provider = fakeProvider({ status: { status: "valid" }, credential: record() });
    const { verifier } = verifierFor(provider);
    await verifier.verify(HUELLA_VALID);
    verifier.forget(HUELLA_VALID);
    await verifier.verify(HUELLA_VALID);
    assert.equal(provider.calls.getStatus, 2);
  });
});
