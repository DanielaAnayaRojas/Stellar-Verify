/**
 * Stellar Verify — huellas de los archivos de ejemplo.
 * Uso desde la raíz del repositorio: node frontend/scripts/verificar-integridad.mjs
 * No necesita instalar dependencias ni modifica ningún archivo.
 * Autor de la contribución original: Gustavo (Gus). Adaptado cuando los datos de demostración
 * salieron del código: ahora calcula la huella (SHA-256) de cada archivo de `public/ejemplos/`,
 * la misma que calcula el navegador, para poder emitirlos como evidencia en testnet.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raizFrontend = fileURLToPath(new URL('../', import.meta.url));
const ejemplos = [
  'diploma-ejemplo-1.txt',
  'certificado-ejemplo-2.txt',
  'constancia-ejemplo-3.txt',
  // Evidencia final (D-day y video): 2 válidas y 1 revocada, emitidas con la capa de firma activa.
  'diploma-demo-1.txt',
  'certificado-demo-2.txt',
  'constancia-demo-3.txt',
  // Reemplazo de certificado-demo-2 (su curso se emitió con un texto equivocado y una credencial no se puede editar).
  'certificado-demo-4.txt',
];

async function calcular() {
  const huellas = new Set();
  for (const archivo of ejemplos) {
    const bytes = await readFile(join(raizFrontend, 'public', 'ejemplos', archivo));
    const huella = createHash('sha256').update(bytes).digest('hex');
    assert.match(huella, /^[a-f0-9]{64}$/, `${archivo}: la huella debe ser SHA-256 hexadecimal de 64 caracteres.`);
    assert.ok(!huellas.has(huella), `${archivo}: dos ejemplos no pueden tener la misma huella.`);
    huellas.add(huella);
    console.log(`✓ ${archivo}\n  ${huella}`);
  }
  console.log(`\nCorrecto: ${ejemplos.length} archivos de ejemplo con huella válida.`);
  console.log('Nota: esto NO demuestra que exista un registro en Stellar o ACTA; solo calcula la huella.');
}

calcular().catch((error) => {
  console.error(`✗ Error: ${error.message}`);
  process.exitCode = 1;
});
