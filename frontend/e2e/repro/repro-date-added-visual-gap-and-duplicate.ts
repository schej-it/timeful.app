import { firefox, type Page } from "@playwright/test"
import { Temporal } from "temporal-polyfill"
import {
  HOME_URL,
  collectSpecificTimesPageEvidence,
  dismissConsent,
  dragSpecificTimesRange,
  getEditorCard,
  saveSpecificTimesGrid,
  setDateSelections,
  withEventMutationLog,
  clickText,
} from "../helpers/firefox-timed-event-harness.ts"

const VIEWPORT = { width: 1440, height: 1600 }

async function openEditDialog(page: Page) {
  await clickText(page, "button", "Edit event")
  const card = getEditorCard(page)
  await card.waitFor({ state: "visible", timeout: 15000 })
  const advancedOptionsButton = card.getByRole("button", { name: /advanced options/i })
  if (await advancedOptionsButton.isVisible().catch(() => false)) {
    await advancedOptionsButton.click({ force: true })
  }
  return card
}

interface VueParentComponentElement {
  __vueParentComponent?: {
    setupState?: Record<string, unknown>
  }
}

async function main() {
  const browser = await firefox.launch({ headless: true })
  // Use Europe/Paris which is +02:00 in June
  const context = await browser.newContext({ viewport: VIEWPORT, timezoneId: "Europe/Paris" })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  try {
    await page.goto(HOME_URL, { waitUntil: "domcontentloaded" })
    await dismissConsent(page)
    await clickText(page, "button", "Create event")

    const editorCard = getEditorCard(page)
    await editorCard.waitFor({ state: "visible" })
    const eventName = `gap-bug-${String(Temporal.Now.instant().epochMilliseconds)}`
    await editorCard.locator('input[placeholder="Name your event..."]').fill(eventName)
    await editorCard.getByTestId("specific-times-toggle").locator("input").check({ force: true })

    // Expand advanced options
    const advanced = editorCard.getByRole("button", { name: /advanced options/i })
    if (await advanced.isVisible().catch(() => false)) {
      await advanced.click({ force: true })
    }

    // Verify the timezone is now +02:00 (Europe/Paris in June)
    const timezoneText = await editorCard
      .locator(".timezone-select__selection-text")
      .first()
      .textContent()
      .catch(() => "")
    console.log("Timezone:", timezoneText)

    // Select June 3 and June 4
    await setDateSelections(editorCard, ["2026-06-03", "2026-06-04"])

    // Click Next to go to specific times grid
    await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
    await page.waitForURL(/\/e\//, { waitUntil: "domcontentloaded", timeout: 30000 })
    await dismissConsent(page)
    await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')

    // Drag-select 0:00-1:00 on June 3 (col 0) and June 4 (col 1)
    await dragSpecificTimesRange(page, { startRow: 0, endRow: 3, col: 0 })
    await page.waitForTimeout(100)
    await dragSpecificTimesRange(page, { startRow: 0, endRow: 3, col: 1 })
    await page.waitForTimeout(100)

    // Click Next to save
    await saveSpecificTimesGrid(page)

    const shortId = page.url().split("/").filter(Boolean).at(-1)

    // === Edit event and add June 9 ===
    await openEditDialog(page)

    // Keep June 3 and 4, add June 9
    await page
      .locator('[data-v-date="2026-06-09"]:visible button')
      .first()
      .click({ force: true })

    // Click Next to go to specific times grid
    const networkLog = await withEventMutationLog(page, async () => {
      await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
      await page.waitForSelector(".schedule-overlap-time-grid__header")
      await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')
      await page.waitForTimeout(1500)
    })

    const screenshotPath = `/tmp/gap-bug-${String(shortId)}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const evidence = await collectSpecificTimesPageEvidence(page)

    const headerInfo = await page.evaluate(() => {
      const header = document.querySelector(".schedule-overlap-time-grid__header")
      if (!header) return { columns: [], gaps: 0, columnCount: 0 }

      const columns = header.querySelectorAll<HTMLElement>(
        ".schedule-overlap-time-grid__day-column"
      )
      const gaps = header.querySelectorAll<HTMLElement>(
        ".schedule-overlap-time-grid__header > div:not(.schedule-overlap-time-grid__day-column)"
      )

      return {
        columns: Array.from(columns).map((c) => c.textContent.replace(/\s+/g, " ").trim()),
        gaps: gaps.length,
        columnCount: columns.length,
      }
    })

    // Debug: dump internal state
    const vueApp = (document.querySelector("#app") as { __vue_app__?: unknown } | null)?.__vue_app__
    console.log("HasVueApp:", !!vueApp)

    // Try accessing component data via the window
    const allDaysDebug = await page.evaluate(() => {
      // Access through element internals
      const allScheduleOverlaps = document.querySelectorAll(".schedule-overlap-layout")
      if (allScheduleOverlaps.length === 0) return { error: "no schedule overlap" }

      // Access the Vue component instance through internal property
      const scheduleOverlapEl = allScheduleOverlaps[0] as VueParentComponentElement
      const vnode = scheduleOverlapEl.__vueParentComponent
      if (!vnode) return { error: "no vnode" }

      const ss = vnode.setupState
      if (!ss) return { error: "no setupState" }

      const allDaysArr = ss.allDays as { value: Record<string, unknown>[] } | undefined
      const daysArr = ss.days as { value: Record<string, unknown>[] } | undefined

      return {
        allDays: allDaysArr?.value.map((d) => ({
          dayText: d.dayText as string,
          dateString: d.dateString as string,
          isConsecutive: d.isConsecutive as boolean,
          dateObjectISO: (d.dateObject as { toString: () => string }).toString(),
        })),
        days: daysArr?.value.map((d) => ({
          dayText: d.dayText as string,
          dateString: d.dateString as string,
          isConsecutive: d.isConsecutive as boolean,
        })),
        state: (ss.state as { value: unknown }).value,
      }
    })
    console.log("AllDays debug:", JSON.stringify(allDaysDebug, null, 2))

    console.log(JSON.stringify({
      scenario: "date-added-visual-gap-and-duplicate",
      setup: {
        shortId,
        eventName,
        timezone: "Europe/Paris (+02:00 in June)",
      },
      networkLog,
      gridEvidence: {
        headerColumns: evidence.headerColumns,
        visibleDateStrings: evidence.visibleDateStrings,
      },
      headerInfo,
      allDaysDebug,
      screenshotPath,
      verdict:
        headerInfo.columns.length !== 3
          ? `ISSUE: Expected 3 header columns, got ${String(headerInfo.columns.length)}: ${JSON.stringify(headerInfo.columns)}`
          : headerInfo.gaps > 1
            ? `ISSUE: ${String(headerInfo.gaps)} gaps (more than 1 expected)`
            : "OK",
    }, null, 2))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

void main()
