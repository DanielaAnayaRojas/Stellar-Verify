import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../src/services/panelApi.js";
import { WalletError } from "../../src/services/freighter.js";
import { TxError, mapError } from "../../src/services/txError.js";
import textos from "../../src/content/textos.json" with { type: "json" };

describe("mapError", () => {
  it("fallos de Freighter", () => {
    const cases = {
      "not-installed": ["no_wallet", true],
      "wrong-network": ["wrong_network", true],
      "wrong-wallet": ["wrong_wallet", true],
      rejected: ["rejected", true],
      failed: ["wallet_error", true],
    };
    for (const [codigo, [kind, retryable]] of Object.entries(cases)) {
      const mapped = mapError(new WalletError(codigo));
      assert.equal(mapped.kind, kind, codigo);
      assert.equal(mapped.retryable, retryable, codigo);
    }
  });

  it("fallos de la API", () => {
    const cases = {
      expirada: ["expired", true],
      duplicada: ["duplicate", false],
      ya_revocada: ["already_revoked", false],
      no_existe: ["not_found", false],
      limite: ["rate_limited", true],
      no_disponible: ["unavailable", true],
      "sin-conexion": ["unavailable", true],
      no_autenticado: ["unauthorized", false],
      datos_invalidos: ["invalid_input", false],
      fondos_insuficientes: ["insufficient_funds", false],
      tx_rechazada: ["tx_rejected", false],
      clave_rechazada: ["service_key", false],
      respuesta_inesperada: ["unexpected_response", true],
      firma_invalida: ["bad_signature", true],
      reto_expirado: ["challenge_expired", true],
    };
    for (const [codigo, [kind, retryable]] of Object.entries(cases)) {
      const mapped = mapError(new ApiError(400, codigo));
      assert.equal(mapped.kind, kind, codigo);
      assert.equal(mapped.retryable, retryable, codigo);
    }
  });

  it("lo desconocido es 'unknown', no reintentable, y conserva el código de seguimiento", () => {
    const mapped = mapError(new ApiError(500, "algo_raro", { requestId: "req-1" }));
    assert.equal(mapped.kind, "unknown");
    assert.equal(mapped.retryable, false);
    assert.equal(mapped.requestId, "req-1");
    assert.equal(mapError(new TypeError("falla interna")).kind, "unknown");
    assert.equal(mapError(undefined).kind, "unknown");
  });

  it("un TxError ya hecho se devuelve igual", () => {
    const error = new TxError({ kind: "unconfirmed", retryable: false, txId: "abc" });
    assert.equal(mapError(error), error);
  });

  it("cada tipo tiene su texto en textos.json (y 'unknown' lleva el código de seguimiento)", () => {
    const kinds = new Set([
      "expired", "rejected", "wrong_wallet", "wrong_network", "no_wallet", "wallet_error", "duplicate",
      "already_revoked", "not_found", "rate_limited", "unavailable", "unauthorized", "invalid_input",
      "insufficient_funds", "issuer_blocked", "tx_rejected", "service_key", "unexpected_response", "unconfirmed", "bad_signature", "challenge_expired", "unknown",
    ]);
    for (const kind of kinds) assert.ok(textos.firma.errores[kind], `falta el texto de ${kind}`);
    for (const kind of ["unknown", "tx_rejected", "service_key", "unexpected_response"]) {
      assert.match(textos.firma.errores[kind], /\{request_id\}/, kind);
    }
    for (const text of Object.values(textos.firma.errores)) assert.ok(text.length > 20);
  });

  it("todo tipo que produce mapError tiene texto", () => {
    const produced = [
      ...["not-installed", "wrong-network", "wrong-wallet", "rejected", "failed"].map((c) => mapError(new WalletError(c))),
      ...["expirada", "duplicada", "ya_revocada", "no_existe", "limite", "no_disponible", "sin-conexion", "no_autenticado", "datos_invalidos", "fondos_insuficientes", "emisor_bloqueado", "tx_rechazada", "clave_rechazada", "respuesta_inesperada", "firma_invalida", "reto_expirado", "x"].map((c) => mapError(new ApiError(400, c))),
    ];
    for (const error of produced) assert.ok(textos.firma.errores[error.messageKey], error.messageKey);
  });
});
