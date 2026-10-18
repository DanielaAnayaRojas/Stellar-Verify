import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchPanelVerification, fetchVerification } from "../../src/services/verifyApi.js";
import { HUELLA_VALID, jsonReply } from "../fixtures.js";

const withReply = (reply) => ({ fetchImpl: async () => reply });

describe("cliente de /api/verify", () => {
  it("consulta la ruta propia con la huella", async () => {
    let requested;
    await fetchVerification(HUELLA_VALID, {
      fetchImpl: async (url) => {
        requested = url;
        return jsonReply(200, { estado: "no_encontrada" });
      },
    });
    assert.equal(requested, `/api/verify/${HUELLA_VALID}`);
  });

  it("válida y revocada traen los datos de la credencial", async () => {
    const valida = await fetchVerification(
      HUELLA_VALID,
      withReply(jsonReply(200, { estado: "valida", institucion: "Instituto", curso: "Curso", fecha: "2026-10-16" })),
    );
    assert.deepEqual(valida, { estado: "valida", institucion: "Instituto", curso: "Curso", fecha: "2026-10-16" });

    const revocada = await fetchVerification(
      HUELLA_VALID,
      withReply(
        jsonReply(200, {
          estado: "revocada",
          institucion: "Instituto",
          curso: "Curso",
          fecha: "2026-10-16",
          revocadaEl: "2026-10-17",
        }),
      ),
    );
    assert.equal(revocada.estado, "revocada");
    assert.equal(revocada.revocadaEl, "2026-10-17");
  });

  it("traduce los estados de la API a las claves de la interfaz", async () => {
    const cases = {
      no_encontrada: "noEncontrada",
      emisor_no_reconocido: "emisorNoReconocido",
      no_verificable: "noVerificable",
    };
    for (const [api, ui] of Object.entries(cases)) {
      const result = await fetchVerification(HUELLA_VALID, withReply(jsonReply(200, { estado: api })));
      assert.deepEqual(result, { estado: ui });
    }
  });

  it("emisor no reconocido: descarta los datos aunque el servidor los mande", async () => {
    const result = await fetchVerification(
      HUELLA_VALID,
      withReply(jsonReply(200, { estado: "emisor_no_reconocido", institucion: "Falsa", curso: "Falso", fecha: "2026-01-01" })),
    );
    assert.deepEqual(result, { estado: "emisorNoReconocido" });
  });

  it("sin conexión, 5xx, JSON roto o estado desconocido: no se pudo comprobar (nunca 'no válida')", async () => {
    const down = await fetchVerification(HUELLA_VALID, {
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    assert.deepEqual(down, { estado: "noVerificable" });

    for (const reply of [
      jsonReply(500, { error: "interno" }),
      jsonReply(200, { estado: "inventado" }),
      new Response("<html>", { status: 200 }),
      jsonReply(200, null),
    ]) {
      assert.deepEqual(await fetchVerification(HUELLA_VALID, withReply(reply)), { estado: "noVerificable" });
    }
  });

  it("válida sin datos completos no se muestra como válida", async () => {
    const result = await fetchVerification(HUELLA_VALID, withReply(jsonReply(200, { estado: "valida", curso: "Curso" })));
    assert.deepEqual(result, { estado: "noVerificable" });
  });

  it("400 es huella inválida", async () => {
    await assert.rejects(
      () => fetchVerification("xyz", withReply(jsonReply(400, { error: "huella_invalida" }))),
      (error) => error.codigo === "huella-invalida",
    );
  });
});

describe("lectura del panel (sin caché)", () => {
  it("consulta /api/panel/credential con la huella y manda la cookie de sesión", async () => {
    let requested;
    let credentials;
    const result = await fetchPanelVerification(HUELLA_VALID, {
      fetchImpl: async (url, init) => {
        requested = url;
        credentials = init.credentials;
        return jsonReply(200, { estado: "no_encontrada" });
      },
    });
    assert.equal(requested, `/api/panel/credential?huella=${HUELLA_VALID}`);
    assert.equal(credentials, "same-origin");
    assert.deepEqual(result, { estado: "noEncontrada" });
  });

  it("sin sesión (401) o con error devuelve 'sin comprobar', nunca 'no válida'", async () => {
    const result = await fetchPanelVerification(HUELLA_VALID, withReply(jsonReply(401, { error: "no_autenticado" })));
    assert.deepEqual(result, { estado: "noVerificable" });
  });
});
