import type { ScenarioDefinition } from "../types.js"
import { dismissConsentIfPresent } from "./helpers.js"

const EVENT_PATH = "/e/dEeaF"

async function openOptions(page: Parameters<ScenarioDefinition["prepare"]>[0], appUrl: string) {
  await page.addInitScript(() => {
    localStorage.showEventOptions = "false"
  })
  await page.goto(new URL(EVENT_PATH, appUrl).toString(), { waitUntil: "domcontentloaded" })
  await dismissConsentIfPresent(page)
  await page
    .locator("button, [role='button'], .v-btn")
    .filter({ hasText: /^\s*Options\s*$/ })
    .first()
    .click({ force: true })
  await page.waitForTimeout(250)
  await page.locator("#hide-if-needed-toggle").click({ force: true })
}

export const eventOptionsStyleOnScenario = {
  readySelector: "body",
  elements: [
    { name: "hideIfNeededSwitch", kind: "eventOptionsSwitch" },
    { name: "hideIfNeededTrack", kind: "eventOptionsSwitchTrack" },
    { name: "hideIfNeededThumb", kind: "eventOptionsSwitchThumb" },
    {
      name: "hideIfNeededLabel",
      kind: "text",
      selector: "div, span, label",
      text: "Hide if needed times",
    },
  ],
  prepare: async (page, label) => {
    await openOptions(page, label.url)
  },
} satisfies ScenarioDefinition
