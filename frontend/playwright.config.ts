import { defineConfig, devices } from "@playwright/test"
import { createFrontendPlaywrightConfig } from "./config/tooling"

const { baseURL, webServerCommand, webServerPort, useExistingServer } =
  createFrontendPlaywrightConfig("development")

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./tmp/playwright",
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
  webServer: useExistingServer
    ? undefined
    : {
        command: webServerCommand,
        port: webServerPort,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /timed-event-.*firefox\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1400 },
      },
    },
    {
      name: "chromium-mobile",
      testIgnore: /timed-event-.*firefox\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
    {
      name: "firefox-desktop",
      testMatch: /timed-event-.*firefox\.spec\.ts/,
      workers: 1,
      use: {
        ...devices["Desktop Firefox"],
        timezoneId: "UTC",
        viewport: { width: 1440, height: 1600 },
      },
    },
  ],
})
