import type { ScenarioDefinition } from "../types.js"
import { gotoComparatorEventUrl, resolveComparatorEventPath } from "./helpers.js"

export const eventLegacyNoteScenario = {
  skipInitialGoto: true,
  readySelector: "body",
  elements: [
    {
      name: "legacyNote",
      kind: "containsText",
      selector: "a",
      text: 'Formerly known as "Schej"',
    },
    { name: "legacyNoteRow", kind: "legacyNoteRow" },
    { name: "legacyNoteIcon", kind: "legacyNoteIcon" },
  ],
  prepare: async (page, label) => {
    await gotoComparatorEventUrl(
      page,
      new URL(resolveComparatorEventPath(), label.url).toString(),
      "event-legacy-note",
    )
    await page
      .locator("a")
      .filter({ hasText: 'Formerly known as "Schej"' })
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
  },
} satisfies ScenarioDefinition
