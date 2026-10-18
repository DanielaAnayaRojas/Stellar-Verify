import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ed25519AddressFromMultibase } from "../../api/_lib/didKey.js";
import {
  FOREIGN_KEY_MULTIBASE,
  FOREIGN_PUBLIC_KEY,
  INSTITUTION_KEY_MULTIBASE,
  INSTITUTION_PUBLIC_KEY,
} from "../fixtures.js";

describe("clave de un DID (multibase) a dirección Stellar", () => {
  it("la clave del DID de la institución es la de su wallet (S7)", () => {
    assert.equal(ed25519AddressFromMultibase(INSTITUTION_KEY_MULTIBASE), INSTITUTION_PUBLIC_KEY);
  });

  it("la clave del DID de la cuenta 2 es la de su wallet", () => {
    assert.equal(ed25519AddressFromMultibase(FOREIGN_KEY_MULTIBASE), FOREIGN_PUBLIC_KEY);
  });

  it("rechaza lo que no es una clave Ed25519 multibase", () => {
    assert.equal(ed25519AddressFromMultibase(""), null);
    assert.equal(ed25519AddressFromMultibase(null), null);
    assert.equal(ed25519AddressFromMultibase("6MkhdjdPeRxMctaDaQWYoyzJ7xM1b5KL8HuYFZGBsJ2ard5"), null);
    assert.equal(ed25519AddressFromMultibase("z0OIl"), null);
    assert.equal(ed25519AddressFromMultibase("zabc"), null);
    // Cambia un carácter: cambia el código de clave o el tamaño y ya no es una clave válida.
    assert.notEqual(
      ed25519AddressFromMultibase(`${INSTITUTION_KEY_MULTIBASE.slice(0, -1)}6`),
      INSTITUTION_PUBLIC_KEY,
    );
  });
});
