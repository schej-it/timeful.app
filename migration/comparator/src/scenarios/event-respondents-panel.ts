import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  resolveComparatorEventPath,
} from "./helpers.js"

export const eventRespondentsPanelScenario = {
  skipInitialGoto: true,
  readySelector: "#drag-section, .respondent-row",
  readyTimeoutMs: 20_000,
  elements: [
    {
      name: "responsesHeading",
      kind: "text",
      selector: "div, span",
      text: "Responses",
    },
    {
      name: "respondentName",
      kind: "containsText",
      selector: "div, span",
      text: "khh",
    },
  ],
  prepare: async (page, label) => {
    await gotoComparatorEventUrl(
      page,
      new URL(resolveComparatorEventPath(), label.url).toString(),
      "event-respondents-panel",
    )
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1500)
  },
} satisfies ScenarioDefinition
