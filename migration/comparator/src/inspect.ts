import process from "node:process"

import { chromium, firefox } from "@playwright/test"

import { parseArgs } from "./cli.js"
import { DEFAULT_NEW_APP_URL, VIEWPORT } from "./config.js"
import { createComparatorContext, waitForUrl } from "./page.js"
import { printSnapshot } from "./report.js"
import { SCENARIOS, SUPPORTED_TARGETS } from "./scenarios/index.js"
import { collectStyles } from "./snapshot.js"

import type { AppLabel } from "./types.js"

async function main() {
  const target = parseArgs(process.argv.slice(2), SUPPORTED_TARGETS)
  const scenario = SCENARIOS[target]
  const browserName = process.env.PLAYWRIGHT_BROWSER ?? "firefox"
  const app: AppLabel = {
    name: "new",
    url: process.env.NEW_APP_URL || DEFAULT_NEW_APP_URL,
  }

  await waitForUrl(app.url)

  const browserType = browserName === "firefox" ? firefox : chromium
  const browser = await browserType.launch()

  try {
    const context = await createComparatorContext(browser, { viewport: VIEWPORT })
    const page = await context.newPage()
    const snapshot = await collectStyles(page, app, scenario)
    await context.close()
    printSnapshot(target, app.name, snapshot)
  } finally {
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
