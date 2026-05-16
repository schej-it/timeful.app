import type { Page } from "@playwright/test"

import type { AppLabel, ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"
const OPTIONS_TEXT = "Options"
const EXPECTED_OPTION_TEXT = "Hide if needed times"

async function openEvent(page: Page, app: AppLabel) {
  await page.goto(new URL(EVENT_PATH, app.url).toString(), { waitUntil: "domcontentloaded" })
  await page
    .locator("button, [role='button'], .v-btn")
    .filter({ hasText: new RegExp(`^\\s*${OPTIONS_TEXT}\\s*$`) })
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
}

async function clickOptions(page: Page) {
  await page
    .locator("button, [role='button'], .v-btn")
    .filter({ hasText: new RegExp(`^\\s*${OPTIONS_TEXT}\\s*$`) })
    .first()
    .click({ force: true })
}

async function assertOptionsContent(page: Page, app: AppLabel) {
  await page.waitForFunction(
    (expectedText) =>
      Array.from(document.querySelectorAll("div, span, label")).some((node) => {
        if (node.textContent?.trim() !== expectedText) {
          return false
        }

        const computed = window.getComputedStyle(node)
        const box = node.getBoundingClientRect()
        return (
          computed.display !== "none" &&
          computed.visibility !== "hidden" &&
          computed.opacity !== "0" &&
          box.width > 0 &&
          box.height > 0
        )
      }),
    EXPECTED_OPTION_TEXT,
  )

  const visibleText = await page.evaluate((expectedText) => {
    const visibleNode = Array.from(document.querySelectorAll("div, span, label")).find((node) => {
      if (node.textContent?.trim() !== expectedText) {
        return false
      }

      const computed = window.getComputedStyle(node)
      const box = node.getBoundingClientRect()
      return (
        computed.display !== "none" &&
        computed.visibility !== "hidden" &&
        computed.opacity !== "0" &&
        box.width > 0 &&
        box.height > 0
      )
    })

    return visibleNode?.textContent?.trim() ?? null
  }, EXPECTED_OPTION_TEXT)

  if (visibleText?.trim() !== EXPECTED_OPTION_TEXT) {
    throw new Error(
      `${app.name} Options content mismatch: expected ${JSON.stringify(EXPECTED_OPTION_TEXT)}, got ${JSON.stringify(visibleText?.trim())}`,
    )
  }
}

export const eventOptionsInteractionScenario = {
  readySelector: "body",
  elements: [],
  prepare: async () => {},
  runInteraction: async (oldPage, newPage) => {
    const oldApp = { name: "old", url: oldPage.url() } satisfies AppLabel
    const newApp = { name: "new", url: newPage.url() } satisfies AppLabel

    await Promise.all([
      oldPage.addInitScript(() => {
        localStorage.showEventOptions = "false"
      }),
      newPage.addInitScript(() => {
        localStorage.showEventOptions = "false"
      }),
    ])

    await Promise.all([openEvent(oldPage, oldApp), openEvent(newPage, newApp)])
    await Promise.all([clickOptions(oldPage), clickOptions(newPage)])
    await Promise.all([assertOptionsContent(oldPage, oldApp), assertOptionsContent(newPage, newApp)])

    console.log(`event-options visibleText=${JSON.stringify(EXPECTED_OPTION_TEXT)}`)
  },
} satisfies ScenarioDefinition
