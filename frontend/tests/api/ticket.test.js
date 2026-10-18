import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTicket, readTicket } from "../../api/_lib/ticket.js";

const SECRET = "s".repeat(40);
const REQUEST = { vcId: "a".repeat(64), owner: "GABC", vcData: "{}" };

describe("ticket de operación", () => {
  it("un ticket válido devuelve exactamente el cuerpo que se preparó", () => {
    const ticket = createTicket({ secret: SECRET, operation: "issue", request: REQUEST });
    assert.deepEqual(readTicket({ secret: SECRET, ticket, operation: "issue" }), { ok: true, request: REQUEST, vaultAddress: null });
  });

  it("puede llevar la dirección del vault, y no se puede cambiar sin romper la firma", () => {
    const vaultAddress = "C" + "A".repeat(55);
    const ticket = createTicket({ secret: SECRET, operation: "issue", request: REQUEST, vaultAddress });
    assert.equal(readTicket({ secret: SECRET, ticket, operation: "issue" }).vaultAddress, vaultAddress);

    const [payload, tag] = ticket.split(".");
    const content = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const forged = Buffer.from(JSON.stringify({ ...content, vault: "C" + "B".repeat(55) })).toString("base64url");
    assert.equal(readTicket({ secret: SECRET, ticket: `${forged}.${tag}`, operation: "issue" }).reason, "bad_tag");
  });

  it("se rechaza con otra clave, otra operación, alterado, mal formado o ausente", () => {
    const ticket = createTicket({ secret: SECRET, operation: "issue", request: REQUEST });
    const [payload, tag] = ticket.split(".");
    const forged = Buffer.from(JSON.stringify({ op: "issue", req: { ...REQUEST, owner: "GATACANTE" }, exp: Date.now() + 60_000 })).toString("base64url");

    assert.equal(readTicket({ secret: "otra".repeat(12), ticket, operation: "issue" }).reason, "bad_tag");
    assert.equal(readTicket({ secret: SECRET, ticket, operation: "revoke" }).reason, "wrong_operation");
    assert.equal(readTicket({ secret: SECRET, ticket: `${forged}.${tag}`, operation: "issue" }).reason, "bad_tag");
    assert.equal(readTicket({ secret: SECRET, ticket: `${payload}.${tag.slice(0, -2)}AA`, operation: "issue" }).reason, "bad_tag");
    for (const bad of ["basura", "", undefined, null, 42, "a.b.c"]) {
      assert.equal(readTicket({ secret: SECRET, ticket: bad, operation: "issue" }).ok, false, String(bad));
    }
  });

  it("caduca a los 3 minutos", () => {
    const now = Date.now();
    const ticket = createTicket({ secret: SECRET, operation: "revoke", request: REQUEST, now });
    assert.equal(readTicket({ secret: SECRET, ticket, operation: "revoke", now: now + 2 * 60 * 1000 }).ok, true);
    assert.equal(readTicket({ secret: SECRET, ticket, operation: "revoke", now: now + 4 * 60 * 1000 }).reason, "expired");
  });
});
