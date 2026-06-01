import {
  APP_BASE_URL,
  assertTimezoneIsUtc,
  collectSpecificTimesPageEvidence,
  enterSpecificTimesGrid,
  openEditDialog,
  openEventPage,
  runFirefoxScenario,
  withEventMutationLog,
} from "../helpers/firefox-timed-event-harness.ts"
import { Temporal } from "temporal-polyfill"

const membershipDates = ["2026-05-28", "2026-05-29"]
const addedDate = "2026-05-30"

const fullDomainSlots = membershipDates.flatMap((date) =>
  ["00:00", "01:00", "02:00", "03:00"].map((time) => `${date}T${time}:00.000Z`)
)
const activeSubset = ["00:00", "01:00", "02:00", "03:00"].map(
  (time) => `2026-05-29T${time}:00.000Z`
)

async function seedCanonicalEvent(name: string): Promise<{ shortId: string }> {
  const body = {
    name,
    duration: 4,
    dates: membershipDates.map((d) => `${d}T00:00:00.000Z`),
    type: "specific_dates",
    hasSpecificTimes: true,
    enabledSlots: fullDomainSlots,
    activeSlots: activeSubset,
    times: activeSubset,
    eventTimezone: "UTC",
    slotGeneration: {
      startTimeLocal: "00:00",
      endTimeLocal: "04:00",
      timeIncrementMinutes: 60,
    },
    timedRecurrence: {
      kind: "specific_dates",
      selectedDays: membershipDates,
      selectedDaysOfWeek: [],
      startOnMonday: true,
    },
    notificationsEnabled: false,
    blindAvailabilityEnabled: false,
    daysOnly: false,
    remindees: [],
    sendEmailAfterXResponses: -1,
    collectEmails: false,
    startOnMonday: true,
    timeIncrement: 60,
    creatorPosthogId: `repro-${String(Temporal.Now.instant().epochMilliseconds)}`,
  }

  const response = await fetch(`${APP_BASE_URL}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const json = (await response.json()) as { shortId?: string }
  if (!response.ok || !json.shortId) {
    throw new Error(
      `Seed failed: ${JSON.stringify({ status: response.status, body: json })}`
    )
  }

  return { shortId: json.shortId }
}

void runFirefoxScenario("edit-date-preserves-selection", async ({ page }) => {
  const seed = await seedCanonicalEvent(
    `edit-date-selection-${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  await openEventPage(page, seed.shortId)

  const editorCard = await openEditDialog(page)
  await assertTimezoneIsUtc(editorCard)

  // Add a new date to the existing selection
  await editorCard
    .locator(`[data-v-date="${addedDate}"]:visible button`)
    .first()
    .click({ force: true })

  const networkLog = await withEventMutationLog(page, async () => {
    await enterSpecificTimesGrid(page)
  })

  // Let the grid settle
  await page.waitForTimeout(500)

  const evidence = await collectSpecificTimesPageEvidence(page)

  // Count selected (white) cells
  const selectedCount = await page.evaluate(() => {
    return document.querySelectorAll(
      '#drag-section .timeslot.tw-bg-white'
    ).length
  })

  // Count total cells
  const totalCells = await page.evaluate(() => {
    return document.querySelectorAll(
      '#drag-section .timeslot[data-row][data-col]'
    ).length
  })

  const expectedSelected = activeSubset.length // 4 cells for May 29

  return {
    setup: {
      shortId: seed.shortId,
      membershipDates,
      addedDate,
      expectedActiveSlots: activeSubset,
    },
    networkLog,
    gridEvidence: {
      headerColumns: evidence.headerColumns,
      visibleDateStrings: evidence.visibleDateStrings,
      totalCells,
      selectedCellCount: selectedCount,
      expectedSelectedCount: expectedSelected,
    },
    checks: {
      // BUG CHECK: if selectedCount is 0, previously selected times were lost
      selectedCellsMatchExpected: selectedCount === expectedSelected,
      hasSelectedCells: selectedCount > 0,
      headerShowsAllDates:
        evidence.visibleDateStrings.some((s) => s.includes("28")) &&
        evidence.visibleDateStrings.some((s) => s.includes("29")) &&
        evidence.visibleDateStrings.some((s) => s.includes("30")),
    },
  }
})
