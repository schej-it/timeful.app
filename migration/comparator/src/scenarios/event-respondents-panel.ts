import type { ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"

export const eventRespondentsPanelScenario = {
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
    await page.waitForTimeout(1500)
  },
} satisfies ScenarioDefinition
