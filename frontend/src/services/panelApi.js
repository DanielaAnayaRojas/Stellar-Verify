// Cliente de la API del panel (/api/auth y /api/panel, mismo origen). La sesión viaja en una cookie
// HttpOnly que el navegador no puede leer; las escrituras llevan una cabecera propia.

export class ApiError extends Error {
  constructor(status, codigo, { retryable = false, field = null, requestId = null } = {}) {
    super(codigo);
    this.name = "ApiError";
    this.status = status;
    this.codigo = codigo;
    this.retryable = retryable;
    this.field = field;
    this.requestId = requestId;
  }
}

export function createPanelApi({ fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  async function request(path, { method = "GET", body } = {}) {
    const headers = { accept: "application/json" };
    if (method !== "GET") {
      headers["content-type"] = "application/json";
      headers["x-sv-request"] = "1";
    }

    let response;
    try {
      response = await fetchImpl(path, {
        method,
        headers,
        credentials: "same-origin",
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      });
    } catch {
      throw new ApiError(0, "sin-conexion", { retryable: true });
    }

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    if (!response.ok) {
      throw new ApiError(response.status, (json && json.error) || "desconocido", {
        retryable: Boolean(json && json.retryable),
        field: (json && json.field) || null,
        requestId: response.headers.get("x-request-id"),
      });
    }
    return json;
  }

  const query = (params) => new URLSearchParams(params).toString();

  return {
    getChallenge: () => request("/api/auth/challenge", { method: "POST" }),
    verifyChallenge: ({ nonce, expiresAt, tag, signature }) =>
      request("/api/auth/verify", { method: "POST", body: { nonce, expiresAt, tag, signature } }),
    getSession: () => request("/api/auth/session"),
    logout: () => request("/api/auth/logout", { method: "POST" }),
    prepareIssue: ({ huella, course, issueDate }) =>
      request("/api/panel/issue-prepare", { method: "POST", body: { huella, course, issueDate } }),
    submitIssue: ({ huella, signedXdr, ticket }) =>
      request("/api/panel/issue-submit", { method: "POST", body: { huella, signedXdr, ticket } }),
    prepareRevoke: ({ huella }) => request("/api/panel/revoke-prepare", { method: "POST", body: { huella } }),
    submitRevoke: ({ huella, signedXdr, ticket }) =>
      request("/api/panel/revoke-submit", { method: "POST", body: { huella, signedXdr, ticket } }),
    checkStatus: ({ huella, expect }) => request(`/api/panel/status?${query({ huella, expect })}`),
  };
}

export const panelApi = createPanelApi();
