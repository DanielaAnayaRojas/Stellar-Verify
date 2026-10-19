import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

// Plugin de Vite solo para desarrollo: sirve las funciones de `api/` en http://localhost:5173/api/...
// igual que lo hace Vercel (sin necesitar la CLI ni iniciar sesión). No participa en `npm run build`.

const MAX_BODY_BYTES = 20 * 1024;
const FILE_PATTERN = /^\[[A-Za-z0-9_]+\]\.js$/;
const DIRECTORY_PATTERN = /^\[[A-Za-z0-9_]+\]$/;

// Busca el archivo de la ruta: coincidencia exacta primero y, si no, un archivo o carpeta dinámicos ([huella].js).
// Lo que empieza por "_" nunca es una ruta (como en Vercel).
async function findHandlerFile(directory, segments) {
  const [head, ...rest] = segments;
  if (!head || head.startsWith("_")) return null;

  const entries = await readdir(directory, { withFileTypes: true });
  if (rest.length === 0) {
    const file =
      entries.find((entry) => entry.isFile() && entry.name === `${head}.js`) ??
      entries.find((entry) => entry.isFile() && FILE_PATTERN.test(entry.name));
    return file ? join(directory, file.name) : null;
  }
  const folder =
    entries.find((entry) => entry.isDirectory() && entry.name === head) ??
    entries.find((entry) => entry.isDirectory() && DIRECTORY_PATTERN.test(entry.name));
  return folder ? findHandlerFile(join(directory, folder.name), rest) : null;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function toWebRequest(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await readBody(request);
    if (body === null) return null;
    init.body = body;
  }
  return new Request(`http://${request.headers.host}${request.url}`, init);
}

async function sendWebResponse(response, nodeResponse) {
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") nodeResponse.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) nodeResponse.setHeader("set-cookie", cookies);
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

function sendJson(nodeResponse, status, body) {
  nodeResponse.statusCode = status;
  nodeResponse.setHeader("content-type", "application/json; charset=utf-8");
  nodeResponse.end(JSON.stringify(body));
}

export function apiDevPlugin() {
  let root = process.cwd();
  return {
    name: "stellar-verify-api-dev",
    apply: "serve",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url ?? "").split("?")[0];
        if (!pathname.startsWith("/api/")) return next();

        try {
          const segments = pathname.split("/").filter(Boolean).slice(1);
          const file = await findHandlerFile(resolve(root, "api"), segments);
          if (!file) return sendJson(response, 404, { error: "no_existe" });

          const webRequest = await toWebRequest(request);
          if (!webRequest) return sendJson(response, 413, { error: "cuerpo_demasiado_grande" });

          const module = await server.ssrLoadModule(file);
          await sendWebResponse(await module.default.fetch(webRequest), response);
        } catch {
          sendJson(response, 500, { error: "interno" });
        }
      });
    },
  };
}
