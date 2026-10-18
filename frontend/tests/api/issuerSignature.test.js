import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";
import { PROOF_TYPE, issuanceMessage, normalizeSignature, verifyIssuanceSignature } from "../../api/_lib/issuerSignature.js";
import { challengeMessage } from "../../api/_lib/session.js";
import { CONFIG, HUELLA_FOREIGN, HUELLA_VALID, INSTITUTION_DID } from "../fixtures.js";

const keypair = Keypair.random();
const config = { ...CONFIG, institutionPublicKey: keypair.publicKey(), signatureLayer: "on" };
const sign = (text, pair = keypair) => Buffer.from(pair.signMessage(text)).toString("base64");

describe("firma del emisor (opción A)", () => {
  it("el texto canónico lleva versión, huella, DID y fecha", () => {
    assert.equal(
      issuanceMessage({ huella: HUELLA_VALID, institutionDid: INSTITUTION_DID, issueDate: "2026-10-18" }),
      `SV1|${HUELLA_VALID}|${INSTITUTION_DID}|2026-10-18`,
    );
    assert.equal(PROOF_TYPE, "StellarSignMessageV1");
  });

  it("una firma correcta verifica", () => {
    const signature = sign(issuanceMessage({ huella: HUELLA_VALID, institutionDid: INSTITUTION_DID, issueDate: "2026-10-18" }));
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-18", signature, config }), true);
  });

  it("falla si cambia la huella, la fecha o el DID de lo firmado", () => {
    const base = { huella: HUELLA_VALID, institutionDid: INSTITUTION_DID, issueDate: "2026-10-18" };
    const signature = sign(issuanceMessage(base));
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_FOREIGN, issueDate: "2026-10-18", signature, config }), false);
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-19", signature, config }), false);
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-18", signature, config: { ...config, institutionDid: "did:stellar:testnet:otrodidcualquiera" } }), false);
  });

  it("falla si la firma es de otra wallet", () => {
    const stranger = Keypair.random();
    const signature = sign(issuanceMessage({ huella: HUELLA_VALID, institutionDid: INSTITUTION_DID, issueDate: "2026-10-18" }), stranger);
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-18", signature, config }), false);
  });

  it("la firma de entrada al panel NO sirve como firma de una credencial (y al revés)", () => {
    const loginSignature = sign(challengeMessage({ nonce: "a".repeat(32), expiresAt: "2026-10-18T10:00:00.000Z", host: "stellar-verify.vercel.app" }));
    assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-18", signature: loginSignature, config }), false);
  });

  it("firmas mal formadas no lanzan: simplemente no verifican", () => {
    for (const signature of [undefined, null, "", "basura", 42, "AAAA", {}]) {
      assert.equal(verifyIssuanceSignature({ huella: HUELLA_VALID, issueDate: "2026-10-18", signature, config }), false, String(signature));
    }
  });

  it("normalizeSignature devuelve base64 canónico o null", () => {
    const signature = sign("hola");
    assert.equal(normalizeSignature(signature), signature);
    assert.equal(normalizeSignature(Buffer.from(signature, "base64").toString("hex")), signature, "acepta hexadecimal");
    assert.equal(normalizeSignature("no es una firma"), null);
    assert.equal(normalizeSignature(undefined), null);
  });
});
