import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ESTADO, initialSigningState, signingReducer } from "../../src/services/signingMachine.js";
import { TxError } from "../../src/services/txError.js";

const run = (actions, from = initialSigningState) => actions.reduce(signingReducer, from);
const error = new TxError({ kind: "expired", retryable: true });

describe("máquina de estados de la firma", () => {
  it("el camino feliz: idle → simulando → esperando-firma → enviando → confirmado", () => {
    let state = initialSigningState;
    assert.equal(state.status, ESTADO.IDLE);

    state = signingReducer(state, { type: "START" });
    assert.equal(state.status, ESTADO.SIMULANDO);

    state = signingReducer(state, { type: "PREPARED", expiresAt: "2026-10-18T10:01:00.000Z" });
    assert.equal(state.status, ESTADO.ESPERANDO_FIRMA);
    assert.equal(state.step, "transaccion");
    assert.equal(state.expiresAt, "2026-10-18T10:01:00.000Z");

    state = signingReducer(state, { type: "SIGNED" });
    assert.equal(state.status, ESTADO.ENVIANDO);

    state = signingReducer(state, { type: "CONFIRMED", result: { txId: "abc" } });
    assert.equal(state.status, ESTADO.CONFIRMADO);
    assert.deepEqual(state.result, { txId: "abc" });
  });

  it("un fallo en cualquier paso en curso lleva a error con el TxError", () => {
    for (const steps of [["START"], ["START", "PREPARED"], ["START", "PREPARED", "SIGNED"]]) {
      const state = run([...steps.map((type) => ({ type })), { type: "FAILED", error }]);
      assert.equal(state.status, ESTADO.ERROR, steps.join(">"));
      assert.equal(state.error, error);
      assert.equal(state.step, null);
    }
  });

  it("desde error, START vuelve a preparar desde cero (no reutiliza nada)", () => {
    const failed = run([{ type: "START" }, { type: "PREPARED", expiresAt: "x" }, { type: "FAILED", error }]);
    const retried = signingReducer(failed, { type: "START" });
    assert.deepEqual(retried, { ...initialSigningState, status: ESTADO.SIMULANDO });
    assert.equal(retried.error, null);
    assert.equal(retried.expiresAt, null);
  });

  it("las acciones fuera de orden se ignoran", () => {
    for (const type of ["PREPARED", "SIGNED", "CONFIRMED", "FAILED"]) {
      assert.equal(signingReducer(initialSigningState, { type, error }), initialSigningState, `idle + ${type}`);
    }
    const preparing = run([{ type: "START" }]);
    assert.equal(signingReducer(preparing, { type: "START" }), preparing, "no se puede empezar dos veces");
    assert.equal(signingReducer(preparing, { type: "SIGNED" }), preparing);
    assert.equal(signingReducer(preparing, { type: "CONFIRMED", result: {} }), preparing);

    const done = run([{ type: "START" }, { type: "PREPARED" }, { type: "SIGNED" }, { type: "CONFIRMED", result: { txId: "t" } }]);
    assert.equal(signingReducer(done, { type: "START" }), done, "confirmado no se reinicia sin RESET");
    assert.equal(signingReducer(done, { type: "FAILED", error }), done, "un fallo tardío no desmiente lo confirmado");
  });

  it("RESET vuelve a idle desde cualquier estado", () => {
    const failed = run([{ type: "START" }, { type: "FAILED", error }]);
    assert.deepEqual(signingReducer(failed, { type: "RESET" }), initialSigningState);
  });

  it("una acción desconocida no cambia nada", () => {
    assert.equal(signingReducer(initialSigningState, { type: "OTRA" }), initialSigningState);
  });
});
