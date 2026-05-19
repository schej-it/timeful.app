import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  resolveComparatorEventPath,
} from "./helpers.js"

export const eventRespondentsPanelHoverScenario = {
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
    {
      name: "respondentSelectionControl",
      kind: "respondentSelectionControl",
    },
  ],
  prepare: async (page, label) => {
    await gotoComparatorEventUrl(
      page,
      new URL(resolveComparatorEventPath(), label.url).toString(),
      "event-respondents-panel-hover",
    )
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1500)

    const hoverTarget = await page.evaluate(() => {
      const respondentName = Array.from(document.querySelectorAll("div, span"))
        .filter((node) => node.textContent?.includes("khh"))
        .sort(
          (left, right) =>
            (left.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER) -
            (right.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER),
        )[0]

      const box = respondentName?.getBoundingClientRect()

      if (!box) {
        return null
      }

      return {
        x: box.left + Math.min(12, box.width / 2),
        y: box.top + box.height / 2,
      }
    })

    if (!hoverTarget) {
      throw new Error("Could not find hovered respondent row for comparator scenario")
    }

    await page.mouse.move(hoverTarget.x, hoverTarget.y)
    await page.evaluate(() => {
      const respondentName = Array.from(document.querySelectorAll("div, span"))
        .filter((node) => node.textContent?.includes("khh"))
        .sort(
          (left, right) =>
            (left.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER) -
            (right.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER),
        )[0]

      const row =
        respondentName?.closest(".respondent-row, .tw-group") ??
        respondentName?.parentElement?.parentElement ??
        null

      row?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }))
      row?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })
    await page.waitForTimeout(250)
  },
} satisfies ScenarioDefinition
