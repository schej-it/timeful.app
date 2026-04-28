import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import path from "path"
import { fileURLToPath } from "url"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,ts}"],
  },
})
