/**
 * Revisa el repositorio y `frontend/dist` en busca de secretos antes de cada commit.
 * Uso, desde la carpeta frontend: node scripts/check-secrets.mjs
 *
 * Busca:
 *  1. Claves secretas de Stellar (una "S" y 55 caracteres base32).
 *  2. Variables con prefijo VITE_ que lleven KEY o SECRET en el nombre (se expondrían al navegador).
 *  3. Archivos .env* versionados en git (salvo .env.example).
 *  4. El valor de ACTA_API_KEY o SESSION_SECRET (del entorno o de .env.local) dentro de cualquier archivo.
 *
 * Nunca imprime el valor de un secreto: solo el tipo de hallazgo, el archivo y la línea.
 */
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".vercel"]);
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|eot|zip|pdf|mp4|mov)$/i;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MIN_SECRET_LENGTH = 16;
const SECRET_VARIABLES = ["ACTA_API_KEY", "SESSION_SECRET"];

const STELLAR_SECRET = /\bS[A-Z2-7]{55}\b/;
const VITE_EXPOSED_NAME = /\bVITE_[A-Z0-9_]*(KEY|SECRET)[A-Z0-9_]*\b/;

async function listFiles(directory, found = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await listFiles(path, found);
    } else if (entry.isFile() && !BINARY_EXTENSIONS.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

function isEnvFile(path) {
  return basename(path).startsWith(".env");
}

// Lee los valores secretos del entorno y de frontend/.env.local (si existe), sin guardarlos en ningún informe.
export async function collectSecretValues({ env = process.env, envLocalPath } = {}) {
  const values = new Map();
  const add = (name, value) => {
    const clean = String(value ?? "").trim().replace(/^["']|["']$/g, "");
    if (clean.length >= MIN_SECRET_LENGTH) values.set(name, clean);
  };

  for (const name of SECRET_VARIABLES) add(name, env[name]);

  if (envLocalPath) {
    let text = "";
    try {
      text = await readFile(envLocalPath, "utf8");
    } catch {
      // Sin .env.local: solo se revisa lo que haya en el entorno.
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && SECRET_VARIABLES.includes(match[1]) && !values.has(match[1])) add(match[1], match[2]);
    }
  }
  return values;
}

export async function scanRepository({ root, versionedFiles = [], secretValues = new Map() }) {
  const findings = [];

  for (const path of versionedFiles) {
    if (isEnvFile(path) && basename(path) !== ".env.example") {
      findings.push({ type: "archivo .env versionado", file: path, line: null });
    }
  }

  for (const path of await listFiles(root)) {
    const { size } = await stat(path);
    if (size > MAX_FILE_BYTES) continue;
    const lines = (await readFile(path, "utf8")).split(/\r?\n/);
    const file = relative(root, path);

    lines.forEach((text, index) => {
      if (STELLAR_SECRET.test(text)) findings.push({ type: "clave secreta de Stellar", file, line: index + 1 });
      if (VITE_EXPOSED_NAME.test(text)) {
        findings.push({ type: "variable VITE_ con KEY o SECRET", file, line: index + 1 });
      }
      // Los .env locales guardan sus valores a propósito (no se versionan); el resto de archivos no.
      if (!isEnvFile(path)) {
        for (const [name, value] of secretValues) {
          if (text.includes(value)) findings.push({ type: `valor de ${name}`, file, line: index + 1 });
        }
      }
    });
  }
  return findings;
}

function listVersionedFiles(root) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

async function main() {
  const frontend = fileURLToPath(new URL("../", import.meta.url));
  const root = join(frontend, "..");

  const versionedFiles = listVersionedFiles(root);
  if (versionedFiles === null) {
    console.warn("Aviso: no se pudo consultar git; no se comprobó si hay archivos .env versionados.");
  }
  const secretValues = await collectSecretValues({ envLocalPath: join(frontend, ".env.local") });
  const findings = await scanRepository({ root, versionedFiles: versionedFiles ?? [], secretValues });

  if (findings.length === 0) {
    console.log(
      `Correcto: 0 hallazgos. Revisado el repositorio y dist/ (valores buscados: ${secretValues.size}).`,
    );
    return;
  }
  for (const finding of findings) {
    const place = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.error(`✗ ${finding.type} — ${place}`);
  }
  console.error(`\n${findings.length} hallazgo(s). No hagas commit hasta resolverlos.`);
  process.exitCode = 1;
}

// Solo corre como programa (no cuando las pruebas lo importan).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
