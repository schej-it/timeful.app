import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vuetify from "vite-plugin-vuetify"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "")
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  if (!apiProxyTarget) {
    throw new Error(
      "Missing VITE_API_PROXY_TARGET. Set it in frontend/.env.local or start Vite with VITE_API_PROXY_TARGET=http://127.0.0.1:3002 npm run dev -- --host 127.0.0.1 --port 4173."
    )
  }

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 4173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/swagger": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
    },
  }
})
