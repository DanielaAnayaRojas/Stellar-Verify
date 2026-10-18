import { Account, Address, Keypair, Networks, Operation, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";
import { VAULT_ADDRESS } from "./fixtures.js";

// Transacciones de Soroban armadas con el SDK, como las prepara ACTA. Las claves son aleatorias y solo
// viven dentro de cada prueba.

export function randomKeypair() {
  return Keypair.random();
}

export function string(value) {
  return nativeToScVal(value, { type: "string" });
}

// Argumentos de `issue` como los entregaría el contrato: emisor, vcId, vcData, DID del emisor.
export function issueArgs({ source, huella, vcData = "{}", issuerDid = "did:stellar:testnet:abcdefghij" }) {
  return [new Address(source).toScVal(), string(huella), string(vcData), string(issuerDid)];
}

export function revokeArgs({ huella, date = "2026-10-18T10:00:00.000Z" }) {
  return [string(huella), string(date)];
}

// Devuelve el XDR en base64. `sign` es el par de claves que firma (o null para dejarla sin firmar).
export function buildInvokeXdr({
  source,
  sign,
  contractId = VAULT_ADDRESS,
  functionName,
  args,
  timeoutSeconds = 60,
  timeBounds = null,
  extraOperations = [],
  sequence = "100",
}) {
  const builder = new TransactionBuilder(new Account(source, sequence), {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  }).addOperation(Operation.invokeContractFunction({ contract: contractId, function: functionName, args }));
  for (const operation of extraOperations) builder.addOperation(operation);
  if (timeBounds) builder.setTimebounds(timeBounds.min, timeBounds.max);
  else builder.setTimeout(timeoutSeconds);

  const transaction = builder.build();
  if (sign) transaction.sign(sign);
  return transaction.toXDR();
}

// Cliente RPC falso: registra lo enviado y responde según la configuración.
export function createFakeRpc({
  send = (tx) => ({ status: "PENDING", hash: Buffer.from(tx.hash()).toString("hex") }),
  results = [{ status: "SUCCESS" }],
} = {}) {
  const sent = [];
  let polls = 0;
  return {
    sent,
    get polls() {
      return polls;
    },
    async sendTransaction(transaction) {
      sent.push(transaction);
      const answer = typeof send === "function" ? send(transaction) : send;
      if (answer instanceof Error) throw answer;
      return answer;
    },
    async getTransaction() {
      const answer = results[Math.min(polls, results.length - 1)];
      polls += 1;
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

// Un resultado de transacción con solo el nombre de su código (lo único que lee el proveedor).
export function resultCode(name) {
  return { result: () => ({ switch: () => ({ name }) }) };
}
