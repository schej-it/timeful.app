import type { ScenarioDefinition } from "../types.js"
import { prepareSharedEventGridPage, resolveComparatorEventPath } from "./helpers.js"

export const eventCollapseHoursScenario = {
  skipInitialGoto: true,
  readySelector: "#drag-section .schedule-overlap-collapsed-row",
  readyTimeoutMs: 30_000,
  elements: [
    {
      name: "collapsedRow",
      kind: "selector",
      selector: "#drag-section .schedule-overlap-collapsed-row",
    },
  ],
  prepare: async (page, label) => {
    await page.addInitScript(() => {
      localStorage.showAllHours = "false"
    })

    await prepareSharedEventGridPage(page, label, resolveComparatorEventPath(), false)
  },
} satisfies ScenarioDefinition
