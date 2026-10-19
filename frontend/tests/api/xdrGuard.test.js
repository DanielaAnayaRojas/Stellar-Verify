import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Address, Asset, Operation, nativeToScVal } from "@stellar/stellar-sdk";
import { GuardError } from "../../api/_lib/errors.js";
import { assertXdrMatches, transactionExpiry } from "../../api/_lib/xdrGuard.js";
import { HUELLA_FOREIGN, HUELLA_VALID, VAULT_ADDRESS } from "../fixtures.js";
import { buildInvokeXdr, issueArgs, randomKeypair, revokeArgs, string } from "../txFixtures.js";

const institution = randomKeypair();
const source = institution.publicKey();

function issueXdr(overrides = {}) {
  return buildInvokeXdr({
    source,
    sign: institution,
    functionName: "issue",
    args: issueArgs({ source, huella: HUELLA_VALID }),
    ...overrides,
  });
}

function check(signedXdr, overrides = {}) {
  return assertXdrMatches({
    signedXdr,
    functionName: "issue",
    huella: HUELLA_VALID,
    source,
    contractId: VAULT_ADDRESS,
    ...overrides,
  });
}

function reason(signedXdr, overrides) {
  try {
    check(signedXdr, overrides);
  } catch (error) {
    assert.ok(error instanceof GuardError, "debe lanzar GuardError");
    return error.reason;
  }
  return "aceptada";
}

describe("guardia del XDR firmado (antes de enviar a la red)", () => {
  it("acepta exactamente lo preparado: issue sobre la huella, firmado por la institución", () => {
    const result = check(issueXdr());
    assert.match(result.hash, /^[0-9a-f]{64}$/);
  });

  it("acepta revoke sobre la huella", () => {
    const xdr = buildInvokeXdr({ source, sign: institution, functionName: "revoke", args: revokeArgs({ huella: HUELLA_VALID }) });
    assert.match(check(xdr, { functionName: "revoke" }).hash, /^[0-9a-f]{64}$/);
  });

  it("encuentra la huella aunque el contrato la reciba dentro de una estructura", () => {
    const xdr = issueXdr({
      args: [new Address(source).toScVal(), nativeToScVal({ vc_id: HUELLA_VALID, otro: 1 }), string("{}")],
    });
    assert.equal(reason(xdr), "aceptada");
  });

  it("rechaza una transacción de otra función", () => {
    assert.equal(reason(issueXdr({ functionName: "transfer" })), "wrong_function");
    assert.equal(reason(issueXdr(), { functionName: "revoke" }), "wrong_function");
  });

  it("rechaza otro contrato", () => {
    const other = "CDRFQRIP4FA3WMPWCSAM3XEY6EM6EGKRYZRSCSVZ5NHCF6AGEVR2XEPQ";
    assert.equal(reason(issueXdr({ contractId: other })), "wrong_contract");
  });

  it("rechaza otra huella", () => {
    assert.equal(reason(issueXdr(), { huella: HUELLA_FOREIGN }), "vc_id_mismatch");
  });

  it("issue sin la cuenta de la institución como emisor", () => {
    const stranger = randomKeypair().publicKey();
    const xdr = issueXdr({ args: issueArgs({ source: stranger, huella: HUELLA_VALID }) });
    assert.equal(reason(xdr), "issuer_missing");
  });

  it("rechaza una fuente distinta de la institución", () => {
    const stranger = randomKeypair();
    const xdr = buildInvokeXdr({
      source: stranger.publicKey(),
      sign: stranger,
      functionName: "issue",
      args: issueArgs({ source, huella: HUELLA_VALID }),
    });
    assert.equal(reason(xdr), "wrong_source");
  });

  it("rechaza lo que no está firmado por la institución", () => {
    assert.equal(reason(issueXdr({ sign: null })), "not_signed");
    assert.equal(reason(issueXdr({ sign: randomKeypair() })), "not_signed");
  });

  it("rechaza más de una operación o una operación que no es invocar un contrato", () => {
    const payment = Operation.payment({ destination: source, asset: Asset.native(), amount: "1" });
    assert.equal(reason(issueXdr({ extraOperations: [payment] })), "wrong_operation");
  });

  it("rechaza una transacción que no es de Soroban", async () => {
    const { Account, Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
    const transaction = new TransactionBuilder(new Account(source, "5"), { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination: source, asset: Asset.native(), amount: "1" }))
      .setTimeout(60)
      .build();
    transaction.sign(institution);
    assert.equal(reason(transaction.toXDR()), "wrong_operation");
  });

  it("rechaza basura, vacío y XDR demasiado largo", () => {
    for (const bad of ["basura", "", undefined, null, 42, "A".repeat(20 * 1024 + 1)]) {
      assert.equal(reason(bad), "xdr_invalid");
    }
  });

  it("rechaza una transacción caducada", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const xdr = issueXdr({ timeBounds: { min: 0, max: nowSeconds - 30 } });
    assert.equal(reason(xdr), "expired");
  });

  it("en los fallos solo da el tipo de los argumentos, nunca sus valores", () => {
    try {
      check(issueXdr(), { huella: HUELLA_FOREIGN });
      assert.fail("debía lanzar");
    } catch (error) {
      assert.deepEqual(error.details.argTypes, ["string", "string", "string", "string"]);
      assert.equal(JSON.stringify(error.details).includes(HUELLA_VALID), false);
    }
  });

  it("transactionExpiry da el instante en que caduca, o null", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const xdr = issueXdr({ timeBounds: { min: 0, max: nowSeconds + 60 } });
    assert.equal(transactionExpiry(xdr), new Date((nowSeconds + 60) * 1000).toISOString());
    assert.equal(transactionExpiry("basura"), null);
  });
});
