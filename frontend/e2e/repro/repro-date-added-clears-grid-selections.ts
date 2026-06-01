import {
  HOME_URL,
  assertTimezoneIsUtc,
  collectSpecificTimesPageEvidence,
  dismissConsent,
  dragSpecificTimesRange,
  getEditorCard,
  openEditDialog,
  runFirefoxScenario,
  saveSpecificTimesGrid,
  setDateSelections,
  withEventMutationLog,
  clickText,
} from "../helpers/firefox-timed-event-harness.ts"
import { Temporal } from "temporal-polyfill"

void runFirefoxScenario("date-added-clears-grid-selections", async ({ page }) => {
  // === SCENARIO STEPS 1-6: Create event via UI with specific times ===

  // Step 1: Start creating a new event
  await page.goto(HOME_URL, { waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await clickText(page, "button", "Create event")

  const editorCard = getEditorCard(page)
  await editorCard.waitFor({ state: "visible" })
  const eventName = `bug-scenario-${String(Temporal.Now.instant().epochMilliseconds)}`
  await editorCard.locator('input[placeholder="Name your event..."]').fill(eventName)
  await editorCard.getByTestId("specific-times-toggle").locator("input").check({ force: true })

  const advancedOptionsButton = editorCard.getByRole("button", {
    name: /advanced options/i,
  })
  if (await advancedOptionsButton.isVisible().catch(() => false)) {
    await advancedOptionsButton.click({ force: true })
  }

  await assertTimezoneIsUtc(editorCard)

  // Step 3: Select June 3 and June 4
  await setDateSelections(editorCard, ["2026-06-03", "2026-06-04"])

  // Step 4: Click Next → creates event, navigates to event page with grid
  await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
  await page.waitForURL(/\/e\//, { waitUntil: "domcontentloaded", timeout: 30000 })
  await dismissConsent(page)
  await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')

  // Step 5: Drag-select 0:00-1:00 on June 3 (col 0) and June 4 (col 1)
  await dragSpecificTimesRange(page, { startRow: 0, endRow: 1, col: 0 })
  await page.waitForTimeout(100)
  await dragSpecificTimesRange(page, { startRow: 0, endRow: 1, col: 1 })
  await page.waitForTimeout(100)

  // Step 6: Click Next to save the times
  await saveSpecificTimesGrid(page)

  const shortId = page.url().split("/").filter(Boolean).at(-1)

  // === SCENARIO STEPS 7-10: Edit event and add June 9 ===

  // Step 7: Click "Edit event"
  const editorCard2 = await openEditDialog(page)
  await assertTimezoneIsUtc(editorCard2)

  // Step 8: Keep June 3 and 4, add June 9
  await editorCard2
    .locator('[data-v-date="2026-06-09"]:visible button')
    .first()
    .click({ force: true })

  // Step 9: Click Next to go to specific times grid
  const networkLog = await withEventMutationLog(page, async () => {
    await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
    await page.waitForSelector(".schedule-overlap-time-grid__header")
    await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')
    // Let the grid fully render and settle
    await page.waitForTimeout(1500)
  })

  // Step 10: Observe grid state
  const evidence = await collectSpecificTimesPageEvidence(page)

  // Get detailed state for each visible cell
  const cellDetails = await page.evaluate(() => {
    const cells = document.querySelectorAll('#drag-section .timeslot[data-row][data-col]')
    return Array.from(cells).map((cell) => {
      const el = cell as HTMLElement
      const row = el.getAttribute('data-row')
      const col = el.getAttribute('data-col')
      const computed = window.getComputedStyle(el)
      return {
        row,
        col,
        className: el.className,
        bgColor: computed.backgroundColor,
        opacity: computed.opacity,
      }
    })
  })

  const selectedCells = cellDetails.filter(c => c.className.includes('tw-bg-white'))
  const grayCells = cellDetails.filter(c => c.className.includes('tw-bg-gray'))
  const selectedCount = selectedCells.length
  const grayCount = grayCells.length
  const totalCells = cellDetails.length

  // Check if any cell has reduced opacity (appearing grey despite being "selected")
  const dimmedCells = selectedCells.filter(c => parseFloat(c.opacity) < 1)

  const isBugReproduced = selectedCount === 0 && grayCount === totalCells

  return {
    scenario: "date-added-clears-grid-selections",
    setup: {
      shortId,
      eventName,
      dates: ["2026-06-03", "2026-06-04"],
      addedDate: "2026-06-09",
    },
    networkLog,
    gridEvidence: {
      headerColumns: evidence.headerColumns,
      visibleDateStrings: evidence.visibleDateStrings,
      totalCells,
      selectedCellCount: selectedCount,
      grayCellCount: grayCount,
      dimmedSelectedCells: dimmedCells.length,
    },
    cellDetails,
    verdict: isBugReproduced
      ? "BUG REPRODUCED: All grid cells are grey after adding a date to existing specific-times event"
      : "NO BUG: Selected cells are still visible after adding a date",
  }
})
