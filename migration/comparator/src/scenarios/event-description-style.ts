import type { ScenarioDefinition } from "../types.js"

const TEST_PATH = "/test"

export const eventDescriptionStyleScenario = {
  readySelector: "#event-description-preview-fixture",
  elements: [
    {
      name: "previewEditButton",
      kind: "selector",
      selector: "#event-description-preview-fixture .event-description-edit-button",
    },
    {
      name: "editCancelButton",
      kind: "selector",
      selector: "#event-description-edit-fixture .event-description-cancel-button",
    },
    {
      name: "editSaveButton",
      kind: "selector",
      selector: "#event-description-edit-fixture .event-description-save-button",
    },
  ],
  prepare: async (page, label) => {
    await page.goto(new URL(TEST_PATH, label.url).toString(), {
      waitUntil: "domcontentloaded",
    })
    await page
      .locator("#event-description-edit-fixture button, #event-description-edit-fixture [role='button'], #event-description-edit-fixture .v-btn")
      .filter({ hasText: /^\s*\+ Add description\s*$/ })
      .first()
      .click({ force: true })
    await page.waitForTimeout(250)
  },
} satisfies ScenarioDefinition
