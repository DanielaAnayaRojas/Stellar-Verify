import { StrKey } from "@stellar/stellar-sdk";

// Convierte la clave pública de un DID (multibase base58btc, "z6Mk...") en la dirección Stellar (G...).
// Una clave Ed25519 multibase es: "z" + base58( 0xed 0x01 + 32 bytes de clave ).

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ED25519_PREFIX = [0xed, 0x01];
const ED25519_KEY_BYTES = 32;

function decodeBase58(text) {
  const bytes = [];
  for (const char of text) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry === -1) return null;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < text.length && text[i] === "1"; i += 1) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

// Devuelve la dirección G... o null si el texto no es una clave Ed25519 multibase válida.
export function ed25519AddressFromMultibase(multibase) {
  if (typeof multibase !== "string" || !multibase.startsWith("z")) return null;
  const decoded = decodeBase58(multibase.slice(1));
  if (!decoded || decoded.length !== ED25519_PREFIX.length + ED25519_KEY_BYTES) return null;
  if (decoded[0] !== ED25519_PREFIX[0] || decoded[1] !== ED25519_PREFIX[1]) return null;
  return StrKey.encodeEd25519PublicKey(Buffer.from(decoded.slice(ED25519_PREFIX.length)));
}
