import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpError, ValidationError } from "../../api/_lib/errors.js";
import { buildVcData, validateCourse, validateHuella, validateIssueDate } from "../../api/_lib/vcData.js";
import { CONFIG, HUELLA_VALID, INSTITUTION_DID } from "../fixtures.js";

const NOW = Date.parse("2026-10-18T15:00:00.000Z");

function keysOf(value, found = []) {
  if (value !== null && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      found.push(key);
      keysOf(inner, found);
    }
  }
  return found;
}

describe("mapeador de vcData (lo único que se escribe en la cadena)", () => {
  it("lleva institución, curso, fecha y un identificador opaco, con el DID del emisor", () => {
    const text = buildVcData({ course: "Curso de prueba", issueDate: "2026-10-16" }, CONFIG, { now: NOW });
    const data = JSON.parse(text);
    assert.deepEqual(data["@context"], ["https://www.w3.org/ns/credentials/v2"]);
    assert.deepEqual(data.type, ["VerifiableCredential", "StellarVerifyCredential"]);
    assert.equal(data.issuer, INSTITUTION_DID);
    assert.deepEqual(Object.keys(data.credentialSubject).sort(), ["course", "id", "institution", "issueDate"]);
    assert.equal(data.credentialSubject.institution, "Institucion de prueba");
    assert.equal(data.credentialSubject.course, "Curso de prueba");
    assert.equal(data.credentialSubject.issueDate, "2026-10-16");
    assert.match(data.credentialSubject.id, /^urn:uuid:[0-9a-f-]{36}$/);
  });

  it("el identificador del titular es aleatorio y no es un DID ni una dirección", () => {
    const first = JSON.parse(buildVcData({ course: "Curso", issueDate: "2026-10-16" }, CONFIG, { now: NOW }));
    const second = JSON.parse(buildVcData({ course: "Curso", issueDate: "2026-10-16" }, CONFIG, { now: NOW }));
    assert.notEqual(first.credentialSubject.id, second.credentialSubject.id);
    assert.equal(first.credentialSubject.id.startsWith("did:"), false);
  });

  it("NUNCA lleva datos personales: lo que sobre en la entrada no sale", () => {
    const text = buildVcData(
      {
        course: "Curso de prueba",
        issueDate: "2026-10-16",
        titular: "María Ejemplo",
        holderName: "María Ejemplo",
        name: "María Ejemplo",
        email: "maria@ejemplo.com",
        document: "1234567890",
        documentoIdentidad: "1234567890",
      },
      CONFIG,
      { now: NOW },
    );
    for (const personal of ["María", "maria@", "1234567890", "titular", "holder", "email", "document"]) {
      assert.equal(text.includes(personal), false, personal);
    }
    // Los números son posiciones de las listas (@context y type), no nombres de campo.
    const allowed = new Set(["@context", "type", "issuer", "credentialSubject", "id", "institution", "course", "issueDate"]);
    const names = keysOf(JSON.parse(text)).filter((key) => !/^\d+$/.test(key));
    assert.deepEqual(names.filter((key) => !allowed.has(key)), []);
  });

  it("pesa mucho menos que el límite de 10.000 bytes", () => {
    const text = buildVcData({ course: "x".repeat(120), issueDate: "2026-10-16" }, CONFIG, { now: NOW });
    assert.ok(Buffer.byteLength(text) < 1000);
  });

  it("sin nombre de institución configurado no emite", () => {
    assert.throws(
      () => buildVcData({ course: "Curso", issueDate: "2026-10-16" }, { ...CONFIG, institutionName: "" }, { now: NOW }),
      (error) => error instanceof HttpError && error.code === "institucion_sin_nombre",
    );
  });

  it("la fecha queda como texto, sin pasar por Date", () => {
    for (const day of ["2026-01-01", "2026-03-31", "2026-10-16"]) {
      const data = JSON.parse(buildVcData({ course: "Curso", issueDate: day }, CONFIG, { now: NOW }));
      assert.equal(data.credentialSubject.issueDate, day);
    }
  });
});

describe("validación de entradas", () => {
  const rejects = (fn, field, code) =>
    assert.throws(fn, (error) => error instanceof ValidationError && error.field === field && error.code === code);

  it("huella: 64 caracteres hexadecimales en minúscula", () => {
    assert.equal(validateHuella(HUELLA_VALID), HUELLA_VALID);
    for (const bad of ["", "abc", HUELLA_VALID.toUpperCase(), `${HUELLA_VALID}0`, 42, null, undefined]) {
      rejects(() => validateHuella(bad), "huella", "huella_invalida");
    }
  });

  it("curso: ni vacío ni de más de 120 caracteres ni con caracteres de control", () => {
    assert.equal(validateCourse("  Curso de diseño  "), "Curso de diseño");
    assert.equal(validateCourse("x".repeat(120)).length, 120);
    for (const bad of ["", "   ", undefined, 7]) rejects(() => validateCourse(bad), "course", "curso_vacio");
    for (const bad of ["x".repeat(121), "Curso\u0000raro", "Curso\nsegunda línea"]) {
      rejects(() => validateCourse(bad), "course", "curso_invalido");
    }
  });

  it("fecha: YYYY-MM-DD real, desde el año 2000 y no posterior a mañana", () => {
    assert.equal(validateIssueDate("2026-10-18", NOW), "2026-10-18");
    assert.equal(validateIssueDate("2026-10-19", NOW), "2026-10-19");
    for (const bad of ["2026-10-20", "2026-02-31", "16/10/2026", "2026-1-5", "1999-12-31", "", null, 20261018]) {
      rejects(() => validateIssueDate(bad, NOW), "issueDate", "fecha_invalida");
    }
  });
});
