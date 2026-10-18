import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestHost, requestOrigin, requireSameOriginWrite } from "../../api/_lib/access.js";

const make = (url, headers = {}) => new Request(url, { method: "POST", headers });
const WRITE = { "x-sv-request": "1" };

describe("host y origen públicos", () => {
  it("en local usa el host de la petición", () => {
    const request = make("http://localhost:5173/api/panel/x", { host: "localhost:5173" });
    assert.equal(requestHost(request), "localhost:5173");
    assert.equal(requestOrigin(request), "http://localhost:5173");
  });

  it("detrás de un proxy usa x-forwarded-host y x-forwarded-proto, no la dirección interna", () => {
    const request = make("http://interno:3000/api/panel/x", {
      "x-forwarded-host": "stellar-verify.vercel.app",
      "x-forwarded-proto": "https",
    });
    assert.equal(requestHost(request), "stellar-verify.vercel.app");
    assert.equal(requestOrigin(request), "https://stellar-verify.vercel.app");
  });

  it("con varios valores en la cabecera toma el primero", () => {
    const request = make("http://interno/x", { "x-forwarded-host": "a.example, b.example", "x-forwarded-proto": "https, http" });
    assert.equal(requestOrigin(request), "https://a.example");
  });

  it("las escrituras del propio sitio pasan aunque la dirección interna sea otra", () => {
    const request = make("http://interno:3000/api/panel/x", {
      ...WRITE,
      origin: "https://stellar-verify.vercel.app",
      "x-forwarded-host": "stellar-verify.vercel.app",
      "x-forwarded-proto": "https",
    });
    assert.doesNotThrow(() => requireSameOriginWrite(request));
  });

  it("un origen distinto, o sin la cabecera propia, se rechaza", () => {
    const other = make("http://interno/x", { ...WRITE, origin: "https://otro.example", "x-forwarded-host": "stellar-verify.vercel.app", "x-forwarded-proto": "https" });
    assert.throws(() => requireSameOriginWrite(other), (error) => error.status === 403 && error.code === "origen_no_permitido");
    const noHeader = make("http://localhost:5173/x", { origin: "http://localhost:5173", host: "localhost:5173" });
    assert.throws(() => requireSameOriginWrite(noHeader), (error) => error.status === 403);
  });
});
