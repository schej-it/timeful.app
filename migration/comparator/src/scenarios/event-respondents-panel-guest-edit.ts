import type { ScenarioDefinition } from "../types.js"
import {
  dismissConsentIfPresent,
  gotoComparatorEventUrl,
  SHARED_EVENT_GUEST_NAME,
  resolveComparatorEventPath,
} from "./helpers.js"

export const eventRespondentsPanelGuestEditScenario = {
  skipInitialGoto: true,
  readySelector: "#drag-section, .respondent-row",
  readyTimeoutMs: 20_000,
  elements: [
    {
      name: "matchingGuestRow",
      kind: "containsText",
      selector: "div, span",
      text: SHARED_EVENT_GUEST_NAME,
    },
  ],
  prepare: async (page, label) => {
    const eventPath = resolveComparatorEventPath()
    const eventId = eventPath.split("/").filter(Boolean).at(-1)
    const eventUrl = new URL(eventPath, label.url).toString()

    await page.addInitScript(() => {
      localStorage.showBestTimes = "false"
    })

    await gotoComparatorEventUrl(page, eventUrl, "guest-edit-initial")
    await dismissConsentIfPresent(page, 1_000)

    if (eventId) {
      await page.evaluate(
        async ({ shortId, guestName }) => {
          try {
            const response = await fetch(`/api/events/${shortId}/ids`)
            if (!response.ok) return
            const ids = (await response.json()) as { longId?: string }
            if (ids.longId) {
              localStorage[`${ids.longId}.guestName`] = guestName
            }
          } catch {
            // Ignore bootstrap failures and let the scenario assertions fail explicitly.
          }
        },
        { shortId: eventId, guestName: SHARED_EVENT_GUEST_NAME },
      )

      await gotoComparatorEventUrl(page, eventUrl, "guest-edit-reload")
      await dismissConsentIfPresent(page, 1_000)
    }

    await page.waitForTimeout(500)

    const editAffordances = await page.evaluate((expectedGuestName) => {
      const rows = Array.from(document.querySelectorAll(".respondent-row"))
      const details = rows.map((row) => {
        const nameNode = Array.from(row.querySelectorAll("div, span")).find((node) => {
          const text = node.textContent?.trim() ?? ""
          return text.length > 0 && !text.includes("mdi-")
        })
        const name = nameNode?.textContent?.trim() ?? row.textContent?.trim() ?? ""
        const hasPencil =
          row.textContent?.includes("mdi-pencil") === true ||
          row.querySelector(".mdi-pencil") != null

        return { name, hasPencil }
      })

      return {
        expectedGuestName,
        rowNames: details.map((detail) => detail.name),
        editableRows: details
          .filter((detail) => detail.hasPencil)
          .map((detail) => detail.name),
      }
    }, SHARED_EVENT_GUEST_NAME)

    if (!editAffordances.rowNames.includes(SHARED_EVENT_GUEST_NAME)) {
      throw new Error(
        `Shared guest row ${JSON.stringify(SHARED_EVENT_GUEST_NAME)} not found: ${JSON.stringify(editAffordances.rowNames)}`,
      )
    }
    if (
      editAffordances.editableRows.length !== 1 ||
      editAffordances.editableRows[0] !== SHARED_EVENT_GUEST_NAME
    ) {
      throw new Error(
        `Expected only ${JSON.stringify(SHARED_EVENT_GUEST_NAME)} to be editable, got ${JSON.stringify(editAffordances.editableRows)}`,
      )
    }
  },
} satisfies ScenarioDefinition
