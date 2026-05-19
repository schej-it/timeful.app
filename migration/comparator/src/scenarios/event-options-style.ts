import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  resolveComparatorEventPath,
} from "./helpers.js"

async function openOptions(page: Parameters<ScenarioDefinition["prepare"]>[0], appUrl: string) {
  await page.addInitScript(() => {
    localStorage.showEventOptions = "false"
  })
  await gotoComparatorEventUrl(
    page,
    new URL(resolveComparatorEventPath(), appUrl).toString(),
    "event-options-style",
  )
  await dismissConsentIfPresent(page)
  await page
    .locator("button, [role='button'], .v-btn")
    .filter({ hasText: /^\s*Options\s*$/ })
    .first()
    .click({ force: true })
  await page.waitForTimeout(250)
}

export const eventOptionsStyleScenario = {
  skipInitialGoto: true,
  readySelector: "body",
  elements: [
    {
      name: "optionsToggle",
      kind: "containsText",
      selector: "button, [role='button'], .v-btn",
      text: "Options",
    },
    { name: "eventOptionsSection", kind: "eventOptionsSection" },
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
