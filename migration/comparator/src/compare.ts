import process from "node:process"

import { chromium, firefox } from "@playwright/test"

import { parseArgs } from "./cli.js"
import { DEFAULT_NEW_APP_URL, DEFAULT_OLD_APP_URL, VIEWPORT } from "./config.js"
import { buildDiff } from "./diff.js"
import { createComparatorContext, waitForUrl } from "./page.js"
import { printDiff } from "./report.js"
import { SCENARIOS, SUPPORTED_TARGETS } from "./scenarios/index.js"
import { collectStyles } from "./snapshot.js"

import type { AppLabel } from "./types.js"

async function main() {
  const target = parseArgs(process.argv.slice(2), SUPPORTED_TARGETS)
  const scenario = SCENARIOS[target]
  const browserName = process.env.PLAYWRIGHT_BROWSER ?? "firefox"
  const oldApp: AppLabel = {
    name: "old",
    url: process.env.OLD_APP_URL || DEFAULT_OLD_APP_URL,
  }
  const newApp: AppLabel = {
    name: "new",
    url: process.env.NEW_APP_URL || DEFAULT_NEW_APP_URL,
  }

  await Promise.all([waitForUrl(oldApp.url), waitForUrl(newApp.url)])

  const browserType =
    browserName === "firefox"
      ? firefox
      : chromium
  const browser = await browserType.launch()
  const oldContext = await createComparatorContext(browser, { viewport: VIEWPORT })
  const newContext = await createComparatorContext(browser, { viewport: VIEWPORT })
  const oldPage = await oldContext.newPage()
  const newPage = await newContext.newPage()

  if (scenario.runInteraction) {
    await scenario.runInteraction(oldPage, newPage)
    await Promise.all([oldContext.close(), newContext.close()])
    await browser.close()
    return
  }

  const [oldSnapshot, newSnapshot] =
    browserName === "firefox"
      ? [
          await collectStyles(oldPage, oldApp, scenario),
          await collectStyles(newPage, newApp, scenario),
        ]
      : await Promise.all([
          collectStyles(oldPage, oldApp, scenario),
          collectStyles(newPage, newApp, scenario),
        ])

  await Promise.all([oldContext.close(), newContext.close()])
  await browser.close()

  printDiff(target, buildDiff(scenario, oldSnapshot, newSnapshot))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
