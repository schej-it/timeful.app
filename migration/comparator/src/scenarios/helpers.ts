import type { Page } from "@playwright/test"

import type { AppLabel } from "../types.js"

export async function clickExactText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click({ force: true })
}

export async function clickContainsText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click({ force: true })
}

export async function openNewEventDialog(page: Page) {
  await clickExactText(page, "button", "Create event")
  await page.waitForSelector('input[placeholder="Name your event..."]')
}

export async function dismissConsentIfPresent(page: Page, timeoutMs = 3_000) {
  const agreeButton = page.getByRole("button", { name: /^agree$/i })

  try {
    await agreeButton.waitFor({ state: "visible", timeout: timeoutMs })
    await agreeButton.click({ force: true })
    await page.waitForTimeout(500)
  } catch {
    // Ignore pages that never render the consent dialog.
  }

  await page.evaluate(() => {
    document.getElementById("qc-cmp2-container")?.remove()
  })
}

const SHARED_EVENT_GUEST_NAME = "sdjkf"

export async function prepareSharedEventGridPage(
  page: Page,
  label: AppLabel,
  eventPath: string,
  showBestTimes: boolean,
) {
  const eventId = eventPath.split("/").filter(Boolean).at(-1)

  await page.addInitScript(
    ({ nextShowBestTimes }) => {
      localStorage.showBestTimes = String(nextShowBestTimes)
    },
    { nextShowBestTimes: showBestTimes },
  )

  const eventUrl = new URL(eventPath, label.url).toString()
  await page.goto(eventUrl, { waitUntil: "domcontentloaded" })
  await dismissConsentIfPresent(page)

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
          // Ignore event-id bootstrap failures and fall back to the default guest state.
        }
      },
      { shortId: eventId, guestName: SHARED_EVENT_GUEST_NAME },
    )

    await page.goto(eventUrl, { waitUntil: "domcontentloaded" })
    await dismissConsentIfPresent(page)
  }

  await page.waitForTimeout(1_500)
}
