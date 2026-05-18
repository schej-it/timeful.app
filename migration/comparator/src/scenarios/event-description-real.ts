import type { ScenarioDefinition } from "../types.js"
import { dismissConsentIfPresent } from "./helpers.js"

const EVENT_PATH = "/e/dEeaF"

export const eventDescriptionRealScenario = {
  readySelector: "body",
  elements: [
    {
      name: "addDescriptionButton",
      kind: "containsText",
      selector: "button, [role='button'], .v-btn",
      text: "+ Add description",
    },
    {
      name: "descriptionEditButton",
      kind: "selector",
      selector: ".event-description-edit-button",
    },
    {
      name: "descriptionPreview",
      kind: "selector",
      selector: ".event-description-edit-button, .tw-leading-6",
    },
  ],
  prepare: async (page, label) => {
    await page.goto(new URL(EVENT_PATH, label.url).toString(), {
      waitUntil: "domcontentloaded",
    })
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1000)
  },
} satisfies ScenarioDefinition
