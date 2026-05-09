import { setTimeout as delay } from "node:timers/promises"

import type { Page } from "@playwright/test"

import type { AppLabel, ScenarioDefinition } from "./types.js"

export async function waitForUrl(url: string, timeoutMs = 120_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      await delay(500)
      continue
    }
  }

  throw new Error(`Timed out waiting for ${url}`)
}

export async function preparePage(page: Page, label: AppLabel, scenario: ScenarioDefinition) {
  await page.route("https://buttons.github.io/**", (route) => route.abort())
  await page.route("https://player.vimeo.com/**", (route) => route.abort())
  await page.route("https://i.vimeocdn.com/**", (route) => route.abort())
  await page.route("https://f.vimeocdn.com/**", (route) => route.abort())
  await page.goto(label.url, { waitUntil: "domcontentloaded" })
  await page.waitForSelector(scenario.readySelector)
  await scenario.prepare(page, label)
}
