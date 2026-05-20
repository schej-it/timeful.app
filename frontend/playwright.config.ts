import { defineConfig, devices } from "@playwright/test"
import { createFrontendPlaywrightConfig } from "./config/tooling"

const { baseURL, webServerCommand, webServerPort } =
  createFrontendPlaywrightConfig("development")

export default defineConfig({
  testDir: "./playwright",
  outputDir: "./playwright/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: webServerCommand,
    port: webServerPort,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1400 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
  ],
})
