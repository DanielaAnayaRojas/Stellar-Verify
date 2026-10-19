import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { apiDevPlugin } from "./dev/apiPlugin.js";

// Variables que solo usa el servidor (api/). Ninguna lleva el prefijo VITE_, así que Vite nunca las
// expone al navegador; aquí solo se pasan al proceso para que las funciones locales las lean de .env.local.
const SERVER_VARIABLES = [
  "ACTA_API_BASE",
  "ACTA_API_KEY",
  "DID_RESOLVER_BASE",
  "INSTITUTION_PUBLIC_KEY",
  "INSTITUTION_DID",
  "INSTITUTION_VAULT_ADDRESS",
  "INSTITUTION_NAME",
  "STELLAR_RPC_URL",
  "SESSION_SECRET",
  "SIGNATURE_LAYER",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const name of SERVER_VARIABLES) {
    if (env[name] !== undefined && process.env[name] === undefined) process.env[name] = env[name];
  }
  return { plugins: [react(), apiDevPlugin()] };
});
