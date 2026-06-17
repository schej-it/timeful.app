import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  resolveComparatorEventPath,
} from "./helpers.js"

export const eventHeaderActionsScenario = {
  skipInitialGoto: true,
  readySelector: "#event-header",
  readyTimeoutMs: 20_000,
  elements: [
    {
      name: "eventHeader",
      kind: "selector",
      selector: "#event-header",
    },
    {
      name: "eventHeaderMetaRow",
      kind: "selector",
      selector: "#event-header-meta-row",
    },
    {
      name: "copyLinkButton",
      kind: "selector",
      selector: "#copy-link-btn",
    },
    {
      name: "editEventButton",
      kind: "selector",
      selector: "#edit-event-btn",
    },
    {
      name: "availabilityButton",
      kind: "containsText",
      selector: "button, [role='button'], .v-btn",
      text: "availability",
    },
  ],
  prepare: async (page, label) => {
    await gotoComparatorEventUrl(
      page,
      new URL(resolveComparatorEventPath(), label.url).toString(),
      "event-header-actions",
    )
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1_500)
  },
} satisfies ScenarioDefinition
