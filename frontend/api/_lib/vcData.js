import { randomUUID } from "node:crypto";
import { ValidationError, HttpError } from "./errors.js";

// ÚNICO lugar que construye el `vcData` que se escribe en la cadena (D17, privacidad mínima).
// Lleva: institución, curso, fecha y un identificador opaco del titular. NUNCA el nombre del titular,
// documento de identidad ni correo: la función solo lee estos campos, así que nada más puede colarse.

const HUELLA_PATTERN = /^[0-9a-f]{64}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const MAX_COURSE_LENGTH = 120;
const MAX_VC_DATA_BYTES = 10_000;
const EARLIEST_DATE = "2000-01-01";
const DAY_MS = 24 * 60 * 60 * 1000;

export function validateHuella(value) {
  if (typeof value !== "string" || !HUELLA_PATTERN.test(value)) throw new ValidationError("huella", "huella_invalida");
  return value;
}

export function validateCourse(value) {
  const course = typeof value === "string" ? value.trim() : "";
  if (course.length === 0) throw new ValidationError("course", "curso_vacio");
  if (course.length > MAX_COURSE_LENGTH || CONTROL_CHARACTERS.test(course)) {
    throw new ValidationError("course", "curso_invalido");
  }
  return course;
}

// Fecha como texto YYYY-MM-DD, real y no posterior a mañana (UTC) para cubrir las zonas horarias.
export function validateIssueDate(value, now = Date.now()) {
  const match = typeof value === "string" ? ISO_DATE.exec(value) : null;
  if (!match) throw new ValidationError("issueDate", "fecha_invalida");
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  const real = check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  if (!real || value < EARLIEST_DATE || check.getTime() > now + DAY_MS) {
    throw new ValidationError("issueDate", "fecha_invalida");
  }
  return value;
}

// Devuelve el texto JSON que se envía a ACTA como `vcData`.
export function buildVcData({ course, issueDate }, config, { subjectId = `urn:uuid:${randomUUID()}`, now } = {}) {
  if (!config.institutionName) throw new HttpError(503, "institucion_sin_nombre");

  const data = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "StellarVerifyCredential"],
    issuer: config.institutionDid,
    credentialSubject: {
      id: subjectId,
      institution: config.institutionName,
      course: validateCourse(course),
      issueDate: validateIssueDate(issueDate, now),
    },
  };

  const text = JSON.stringify(data);
  if (Buffer.byteLength(text) > MAX_VC_DATA_BYTES) throw new ValidationError("course", "curso_invalido");
  return text;
}
