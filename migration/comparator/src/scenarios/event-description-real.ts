import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  resolveComparatorEventPath,
} from "./helpers.js"

export const eventDescriptionRealScenario = {
  skipInitialGoto: true,
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
    await gotoComparatorEventUrl(
      page,
      new URL(resolveComparatorEventPath(), label.url).toString(),
      "event-description-real",
    )
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1000)
  },
} satisfies ScenarioDefinition
