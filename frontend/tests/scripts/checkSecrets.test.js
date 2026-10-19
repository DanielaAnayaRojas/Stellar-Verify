import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectSecretValues, scanRepository } from "../../scripts/check-secrets.mjs";

// Los "secretos" de estas pruebas se arman al ejecutar: así este archivo no contiene nada que el propio
// revisor tenga que marcar.
const fakeStellarSeed = `S${"A".repeat(55)}`;
const fakeViteVariable = ["VITE", "ACTA", "KEY"].join("_");
const fakeApiKey = "k".repeat(64);

let root;

async function addFile(relativePath, content) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), "sv-secrets-"));
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("check-secrets", () => {
  it("un árbol limpio no tiene hallazgos (el .env.example con nombres vacíos no cuenta)", async () => {
    await addFile("frontend/.env.example", "ACTA_API_KEY=\nSESSION_SECRET=\n");
    await addFile("frontend/src/App.jsx", "export default function App() { return null; }\n");
    const findings = await scanRepository({ root, versionedFiles: ["frontend/.env.example"] });
    assert.deepEqual(findings, []);
  });

  it("detecta una clave secreta de Stellar y dice dónde, sin imprimirla", async () => {
    await addFile("frontend/src/mala.js", `const semilla = "${fakeStellarSeed}";\n`);
    const findings = await scanRepository({ root });
    const hit = findings.find((f) => f.type === "clave secreta de Stellar");
    assert.deepEqual({ file: hit.file.replace(/\\/g, "/"), line: hit.line }, { file: "frontend/src/mala.js", line: 1 });
    assert.equal(JSON.stringify(findings).includes(fakeStellarSeed), false);
  });

  it("detecta variables VITE_ con KEY o SECRET", async () => {
    await addFile("frontend/src/expuesta.js", `const k = import.meta.env.${fakeViteVariable};\n`);
    const findings = await scanRepository({ root });
    assert.ok(findings.some((f) => f.type === "variable VITE_ con KEY o SECRET"));
  });

  it("detecta archivos .env versionados, salvo .env.example", async () => {
    const findings = await scanRepository({
      root,
      versionedFiles: ["frontend/.env.example", "frontend/.env.local", ".env"],
    });
    const versioned = findings.filter((f) => f.type === "archivo .env versionado").map((f) => f.file);
    assert.deepEqual(versioned.sort(), [".env", "frontend/.env.local"]);
  });

  it("detecta el valor de la llave de ACTA en cualquier archivo, pero no en .env.local", async () => {
    await addFile("frontend/dist/assets/index.js", `fetch("x",{headers:{k:"${fakeApiKey}"}})\n`);
    await addFile("frontend/.env.local", `ACTA_API_KEY=${fakeApiKey}\n`);
    const secretValues = await collectSecretValues({ env: { ACTA_API_KEY: fakeApiKey } });
    const findings = await scanRepository({ root, secretValues });
    const leaks = findings.filter((f) => f.type === "valor de ACTA_API_KEY");
    assert.equal(leaks.length, 1);
    assert.match(leaks[0].file.replace(/\\/g, "/"), /dist\/assets\/index\.js$/);
    assert.equal(JSON.stringify(findings).includes(fakeApiKey), false);
  });

  it("collectSecretValues lee .env.local y descarta valores cortos", async () => {
    const values = await collectSecretValues({
      env: { SESSION_SECRET: "corto" },
      envLocalPath: join(root, "frontend", ".env.local"),
    });
    assert.equal(values.get("ACTA_API_KEY"), fakeApiKey);
    assert.equal(values.has("SESSION_SECRET"), false);
  });

  it("ignora node_modules y .git", async () => {
    await addFile("node_modules/paquete/index.js", `const s = "${fakeStellarSeed}";\n`);
    await addFile(".git/config", `${fakeStellarSeed}\n`);
    const findings = await scanRepository({ root });
    assert.equal(findings.some((f) => /node_modules|\.git/.test(f.file)), false);
  });
});
