import type { ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"

export const eventRespondentsPanelHoverScenario = {
  readySelector: "body",
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
    await page.goto(new URL(EVENT_PATH, label.url).toString(), {
      waitUntil: "domcontentloaded",
    })

    const agreeButton = page.getByRole("button", { name: /^agree$/i })
    if (await agreeButton.isVisible().catch(() => false)) {
      await agreeButton.click({ force: true })
      await page.waitForTimeout(500)
    }

    await page.evaluate(() => {
      document.getElementById("qc-cmp2-container")?.remove()
    })
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
