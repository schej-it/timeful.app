import type { Page } from "@playwright/test"

import type { AppLabel, ScenarioDefinition } from "../types.js"
import { prepareSharedEventGridPage, resolveComparatorEventPath } from "./helpers.js"

async function enterOverlayAvailabilityEditMode(page: Page, label: AppLabel) {
  await prepareSharedEventGridPage(page, label, resolveComparatorEventPath(), false)

  await page
    .locator("button, [role='button'], .v-btn")
    .filter({ hasText: /^\s*\+\s*Add availability\s*$/i })
    .first()
    .click({ force: true })

  await page.locator("#overlay-availabilities-toggle").waitFor({
    state: "visible",
    timeout: 10_000,
  })
  await page.locator("#overlay-availabilities-toggle").click({ force: true })

  await page.locator("#drag-section .overlay-avail-shadow-green").first().waitFor({
    state: "visible",
    timeout: 10_000,
  })
}

export const eventOverlayAvailabilityScenario = {
  skipInitialGoto: true,
  readySelector: "#drag-section .overlay-avail-shadow-green",
  readyTimeoutMs: 30_000,
  elements: [
    {
      name: "overlayAvailableBlock",
      kind: "selector",
      selector: "#drag-section .overlay-avail-shadow-green",
    },
  ],
  prepare: enterOverlayAvailabilityEditMode,
} satisfies ScenarioDefinition
