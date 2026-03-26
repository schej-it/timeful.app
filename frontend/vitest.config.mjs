import { defineConfig } from "vitest/config"
import path from "path"
import { fileURLToPath } from "url"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
})
