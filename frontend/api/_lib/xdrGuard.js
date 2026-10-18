import {
  Address,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import { GuardError } from "./errors.js";

// El envío NO es un relevo ciego: antes de mandar la transacción firmada a la red, el servidor la
// decodifica y comprueba que es exactamente lo que se preparó.

const MAX_XDR_LENGTH = 20 * 1024;

function containsValue(value, target) {
  if (value === target) return true;
  if (value instanceof Map) return [...value.values()].some((item) => containsValue(item, target));
  if (Array.isArray(value)) return value.some((item) => containsValue(item, target));
  if (value !== null && typeof value === "object" && !(value instanceof Uint8Array)) {
    return Object.values(value).some((item) => containsValue(item, target));
  }
  return false;
}

function describeType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Map) return "map";
  if (value instanceof Uint8Array) return "bytes";
  return typeof value;
}

// Instante (ISO) en que caduca una transacción, o null si no tiene límite de tiempo.
export function transactionExpiry(xdr) {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    const maxTime = Number(tx.timeBounds?.maxTime ?? 0);
    return maxTime > 0 ? new Date(maxTime * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

// Comprueba que `signedXdr` es una sola invocación al contrato del vault, con la función esperada,
// sobre la huella esperada, con la cuenta de la institución como fuente y firmada por ella.
// Lanza GuardError(reason). reason: xdr_invalid | fee_bump | wrong_source | wrong_operation | wrong_contract |
// wrong_function | vc_id_mismatch | issuer_missing | not_signed | expired
export function assertXdrMatches({ signedXdr, functionName, huella, source, contractId, now = Date.now() }) {
  if (typeof signedXdr !== "string" || signedXdr.length === 0 || signedXdr.length > MAX_XDR_LENGTH) {
    throw new GuardError("xdr_invalid");
  }

  let transaction;
  try {
    transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  } catch {
    throw new GuardError("xdr_invalid");
  }
  if (transaction instanceof FeeBumpTransaction || !(transaction instanceof Transaction)) {
    throw new GuardError("fee_bump");
  }
  if (transaction.source !== source) throw new GuardError("wrong_source");

  const [operation] = transaction.operations;
  if (transaction.operations.length !== 1 || operation.type !== "invokeHostFunction") {
    throw new GuardError("wrong_operation");
  }

  // En el SDK 17 los valores XDR son objetos con propiedades (no métodos).
  const invocation = operation.func.type === "hostFunctionTypeInvokeContract" ? operation.func.invokeContract : null;
  if (!invocation) throw new GuardError("wrong_operation");

  const target = Address.fromScAddress(invocation.contractAddress).toString();
  if (target !== contractId) throw new GuardError("wrong_contract");

  const called = String(invocation.functionName);
  if (called !== functionName) throw new GuardError("wrong_function", { called });

  const args = invocation.args.map((arg) => scValToNative(arg));
  const argTypes = args.map(describeType);
  // El vcId es la huella. Se busca por valor (también dentro de estructuras) porque el orden exacto de
  // los argumentos lo define el contrato de ACTA.
  if (!containsValue(args, huella)) throw new GuardError("vc_id_mismatch", { argTypes });
  if (functionName === "issue" && !containsValue(args, source)) throw new GuardError("issuer_missing", { argTypes });

  const hash = transaction.hash();
  const keypair = Keypair.fromPublicKey(source);
  const hint = keypair.signatureHint();
  const signed = transaction.signatures.some((decorated) => {
    if (!Buffer.from(decorated.hint.value).equals(hint)) return false;
    try {
      return keypair.verify(hash, decorated.signature.value);
    } catch {
      return false;
    }
  });
  if (!signed) throw new GuardError("not_signed");

  const maxTime = Number(transaction.timeBounds?.maxTime ?? 0);
  if (maxTime > 0 && maxTime * 1000 < now) throw new GuardError("expired");

  return { hash: Buffer.from(hash).toString("hex") };
}
