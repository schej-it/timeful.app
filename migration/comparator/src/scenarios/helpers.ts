import type { Page } from "@playwright/test"

import { runWithPhaseTimeout } from "../page.js"
import type { AppLabel } from "../types.js"

export const DEFAULT_EVENT_PATH = "/e/dEeaF"
const SUPPORTED_EVENT_WAIT_UNTIL = [
  "commit",
  "domcontentloaded",
  "load",
  "networkidle",
] as const

type EventWaitUntil = (typeof SUPPORTED_EVENT_WAIT_UNTIL)[number]

export function resolveComparatorEventPath(defaultPath = DEFAULT_EVENT_PATH) {
  const overridePath = process.env.COMPARATOR_EVENT_PATH?.trim()
  if (!overridePath) {
    return defaultPath
  }

  return overridePath.startsWith("/") ? overridePath : `/${overridePath}`
}

export function resolveComparatorEventWaitUntil(
  defaultWaitUntil: EventWaitUntil = "domcontentloaded",
): EventWaitUntil {
  const overrideWaitUntil = process.env.COMPARATOR_EVENT_WAIT_UNTIL?.trim()
  if (!overrideWaitUntil) {
    return defaultWaitUntil
  }

  if (SUPPORTED_EVENT_WAIT_UNTIL.includes(overrideWaitUntil as EventWaitUntil)) {
    return overrideWaitUntil as EventWaitUntil
  }

  throw new Error(
    `Unsupported COMPARATOR_EVENT_WAIT_UNTIL=${JSON.stringify(overrideWaitUntil)}. Expected one of ${SUPPORTED_EVENT_WAIT_UNTIL.join(", ")}`,
  )
}

export async function gotoComparatorEventUrl(
  page: Page,
  url: string,
  phaseLabel = "event-route",
) {
  const waitUntil = resolveComparatorEventWaitUntil()

  console.error(
    `[comparator] event-goto:start phase=${phaseLabel} url=${url} waitUntil=${waitUntil}`,
  )
  await runWithPhaseTimeout(
    `event goto ${phaseLabel} ${url}`,
    page.goto(url, { waitUntil }),
  )
  console.error(`[comparator] event-goto:done phase=${phaseLabel} url=${url}`)
}

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
  await gotoComparatorEventUrl(page, eventUrl, "shared-grid-initial")
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

    await gotoComparatorEventUrl(page, eventUrl, "shared-grid-reload")
    await dismissConsentIfPresent(page)
  }

  await page.waitForTimeout(1_500)
}
