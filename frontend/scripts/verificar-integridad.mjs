/**
 * Stellar Verify — verificación de integridad del conjunto de demostración.
 * Uso desde la raíz del repositorio: node frontend/scripts/verificar-integridad.mjs
 * No necesita instalar dependencias ni modifica ningún archivo.
 * Autor de contribución propuesta: Gustavo (Gus).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raizFrontend = fileURLToPath(new URL('../', import.meta.url));
const ubicacion = (...partes) => join(raizFrontend, ...partes);
const ejemplos = [
  { archivo: 'diploma-ejemplo-1.txt', estado: 'valida' },
  { archivo: 'certificado-ejemplo-2.txt', estado: 'valida' },
  { archivo: 'constancia-ejemplo-3.txt', estado: 'revocada' },
];

function fechaValida(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
}

async function verificar() {
  const fuente = await readFile(ubicacion('src', 'data', 'credenciales.json'), 'utf8');
  const datos = JSON.parse(fuente);
  assert.ok(Array.isArray(datos.instituciones) && datos.instituciones.length > 0,
    'Debe existir al menos una institución de demostración.');
  assert.ok(Array.isArray(datos.credenciales) && datos.credenciales.length > 0,
    'Debe existir al menos una credencial de demostración.');

  const emisores = new Set(datos.instituciones.map((institucion) => institucion.id));
  const huellas = new Set();
  for (const credencial of datos.credenciales) {
    assert.match(credencial.huella, /^[a-f0-9]{64}$/,
      'Cada credencial debe tener una huella SHA-256 hexadecimal de 64 caracteres.');
    assert.ok(!huellas.has(credencial.huella), 'No pueden existir huellas repetidas.');
    huellas.add(credencial.huella);
    assert.ok(emisores.has(credencial.institucionId), 'Hay una institución desconocida.');
    assert.ok(typeof credencial.titular === 'string' && credencial.titular.trim(),
      'Falta el titular de una credencial.');
    assert.ok(typeof credencial.logro === 'string' && credencial.logro.trim(),
      'Falta el logro de una credencial.');
    assert.ok(fechaValida(credencial.fechaEmision), 'Fecha de emisión inválida.');
    assert.ok(['valida', 'revocada'].includes(credencial.estado),
      'La credencial debe estar válida o revocada.');
    assert.ok(typeof credencial.evidenciaRef === 'string' && credencial.evidenciaRef,
      'Falta evidenciaRef.');
    if (credencial.estado === 'revocada') {
      assert.ok(fechaValida(credencial.fechaRevocacion),
        'Las credenciales revocadas requieren fechaRevocacion.');
      assert.ok(credencial.fechaRevocacion >= credencial.fechaEmision,
        'La revocación no puede ser anterior a la emisión.');
    }
  }

  for (const ejemplo of ejemplos) {
    const bytes = await readFile(ubicacion('public', 'ejemplos', ejemplo.archivo));
    const huella = createHash('sha256').update(bytes).digest('hex');
    const credencial = datos.credenciales.find((c) => c.huella === huella);
    assert.ok(credencial, `${ejemplo.archivo}: su huella ${huella} no está registrada.`);
    assert.equal(credencial.estado, ejemplo.estado,
      `${ejemplo.archivo}: debería estar ${ejemplo.estado}.`);
    console.log(`✓ ${ejemplo.archivo} — ${credencial.estado} — huella correcta`);
  }
  console.log(`\nCorrecto: ${ejemplos.length} archivos y ${datos.credenciales.length} credenciales comprobados.`);
  console.log('Nota: esta prueba NO demuestra que exista registro real en Stellar o ACTA.');
}

verificar().catch((error) => {
  console.error(`✗ Error de integridad: ${error.message}`);
  process.exitCode = 1;
});
