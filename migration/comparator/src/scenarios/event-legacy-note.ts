import type { ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"

export const eventLegacyNoteScenario = {
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
    await page.goto(new URL(EVENT_PATH, label.url).toString(), { waitUntil: "domcontentloaded" })
    await page
      .locator("a")
      .filter({ hasText: 'Formerly known as "Schej"' })
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
  },
} satisfies ScenarioDefinition
