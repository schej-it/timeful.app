import type { ScenarioDefinition } from "../types.js"
import { dismissConsentIfPresent } from "./helpers.js"

const EVENT_PATH = "/e/dEeaF"

export const eventRespondentsPanelScenario = {
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
    await page.goto(new URL(EVENT_PATH, label.url).toString(), { waitUntil: "domcontentloaded" })
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1500)
  },
} satisfies ScenarioDefinition
