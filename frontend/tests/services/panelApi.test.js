import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError, createPanelApi } from "../../src/services/panelApi.js";
import { jsonReply } from "../fixtures.js";

function apiWith(reply) {
  const calls = [];
  const api = createPanelApi({
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return typeof reply === "function" ? reply(path, init) : reply;
    },
  });
  return { api, calls };
}

describe("cliente del panel", () => {
  it("las escrituras llevan la cabecera propia, JSON y la cookie de mismo origen", async () => {
    const { api, calls } = apiWith(jsonReply(200, { xdr: "X" }));
    await api.prepareIssue({ huella: "h", course: "c", issueDate: "2026-10-16", owner: "NO", titular: "NO" });
    const { path, init } = calls[0];
    assert.equal(path, "/api/panel/issue-prepare");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["x-sv-request"], "1");
    assert.equal(init.credentials, "same-origin");
    // Solo viajan los campos de la operación: nada más que el navegador tenga a mano.
    assert.deepEqual(JSON.parse(init.body), { huella: "h", course: "c", issueDate: "2026-10-16" });
  });

  it("las lecturas no llevan cabecera de escritura", async () => {
    const { api, calls } = apiWith(jsonReply(200, { authenticated: false }));
    await api.getSession();
    await api.checkStatus({ huella: "h", expect: "valid" });
    assert.equal(calls[0].path, "/api/auth/session");
    assert.equal(calls[1].path, "/api/panel/status?huella=h&expect=valid");
    for (const { init } of calls) assert.equal("x-sv-request" in init.headers, false);
  });

  it("el envío lleva la huella, el XDR firmado y el ticket de la preparación", async () => {
    const { api, calls } = apiWith(jsonReply(200, {}));
    await api.submitIssue({ huella: "h", signedXdr: "x", ticket: "t" });
    await api.submitRevoke({ huella: "h", signedXdr: "x", ticket: "t" });
    for (const { init } of calls) assert.deepEqual(JSON.parse(init.body), { huella: "h", signedXdr: "x", ticket: "t" });
  });

  it("cada operación usa su ruta", async () => {
    const { api, calls } = apiWith(jsonReply(200, {}));
    await api.getChallenge();
    await api.verifyChallenge({ nonce: "n", expiresAt: "e", tag: "t", signature: "s" });
    await api.logout();
    await api.submitIssue({ huella: "h", signedXdr: "x", ticket: "t" });
    await api.prepareRevoke({ huella: "h" });
    await api.submitRevoke({ huella: "h", signedXdr: "x", ticket: "t" });
    assert.deepEqual(
      calls.map((call) => call.path),
      ["/api/auth/challenge", "/api/auth/verify", "/api/auth/logout", "/api/panel/issue-submit", "/api/panel/revoke-prepare", "/api/panel/revoke-submit"],
    );
  });

  it("un error del servidor es un ApiError con su código, si se puede reintentar y el id de petición", async () => {
    const reply = new Response(JSON.stringify({ error: "expirada", retryable: true, field: "x" }), {
      status: 400,
      headers: { "x-request-id": "req-7" },
    });
    const { api } = apiWith(reply);
    await assert.rejects(
      () => api.submitIssue({ huella: "h", signedXdr: "x" }),
      (error) => error instanceof ApiError && error.codigo === "expirada" && error.retryable === true && error.requestId === "req-7" && error.field === "x",
    );
  });

  it("sin conexión o con una respuesta que no es JSON, el fallo es entendible", async () => {
    const down = createPanelApi({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); } });
    await assert.rejects(() => down.getSession(), (error) => error.codigo === "sin-conexion" && error.retryable === true);

    const { api } = apiWith(new Response("<html>", { status: 502 }));
    await assert.rejects(() => api.getSession(), (error) => error.status === 502 && error.codigo === "desconocido");
  });
});
