import { expect, test } from "@playwright/test"
import {
  SLOT_UTC_MAY_28,
  SLOT_UTC_MAY_29,
  buildSpecificDateSeed,
  clickDateCell,
  collectDatePickerState,
  dismissConsent,
  fetchEventByShortId,
  openEditDialog,
  openEventPage,
  proceedToSpecificTimesGrid,
  revealAdvancedOptions,
  saveEditorAndWaitForPut,
  seedCanonicalTimedEvent,
  selectedDatesFromState,
  setSpecificTimesEnabled,
  sortIsoInstants,
} from "./helpers/timed-event-helpers"

test.describe.configure({ mode: "serial" })

test("enabling specific-times and saving without grid edits preserves canonical timed fields", async ({
  page,
  request,
}) => {
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: "Specific-times no-op regression",
      selectedDays: ["2026-05-28", "2026-05-29"],
      enabledSlots: [...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29],
      eventTimezone: "UTC",
      startTimeLocal: "00:00:00",
      endTimeLocal: "04:00:00",
      timeIncrementMinutes: 60,
      activeSlots: [...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29],
      hasSpecificTimes: false,
    })
  )
  const baselineEvent = await fetchEventByShortId(request, seeded.shortId)

  await openEventPage(page, seeded.shortId)
  const editorCard = await openEditDialog(page)
  await revealAdvancedOptions(editorCard)
  await setSpecificTimesEnabled(editorCard, true)
  await proceedToSpecificTimesGrid(page)
  await saveEditorAndWaitForPut(page, { action: "next" })

  const savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29])
  )
  expect(savedEvent.eventTimezone).toBe(baselineEvent.eventTimezone)
  expect(savedEvent.slotGeneration).toEqual(baselineEvent.slotGeneration)
  expect(savedEvent.timedRecurrence).toEqual(baselineEvent.timedRecurrence)

  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  const reopenedEditor = await openEditDialog(page)
  const selectedDates = selectedDatesFromState(await collectDatePickerState(reopenedEditor))
  expect(selectedDates).toEqual(["2026-05-28", "2026-05-29"])
})

test("disabling specific-times restores active slots to the full enabled domain", async ({
  page,
  request,
}) => {
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: "Disable specific-times regression",
      selectedDays: ["2026-05-28", "2026-05-29"],
      enabledSlots: [...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29],
      activeSlots: [...SLOT_UTC_MAY_29],
      eventTimezone: "UTC",
      startTimeLocal: "00:00:00",
      endTimeLocal: "04:00:00",
      timeIncrementMinutes: 60,
    })
  )

  await openEventPage(page, seeded.shortId)
  const editorCard = await openEditDialog(page)
  await revealAdvancedOptions(editorCard)
  await setSpecificTimesEnabled(editorCard, false)
  await saveEditorAndWaitForPut(page, { action: "save" })

  const savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29])
  )
})

test("timed date edits preserve active subsets on add and remove both enabled and active slots on delete", async ({
  page,
  request,
}) => {
  const newDaySlots = [
    "2026-05-30T00:00:00Z",
    "2026-05-30T01:00:00Z",
    "2026-05-30T02:00:00Z",
    "2026-05-30T03:00:00Z",
  ]
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: "Date add remove regression",
      selectedDays: ["2026-05-28", "2026-05-29"],
      enabledSlots: [...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29],
      activeSlots: [...SLOT_UTC_MAY_29],
      eventTimezone: "UTC",
      startTimeLocal: "00:00:00",
      endTimeLocal: "04:00:00",
      timeIncrementMinutes: 60,
    })
  )

  await openEventPage(page, seeded.shortId)
  let editorCard = await openEditDialog(page)
  await clickDateCell(editorCard, "2026-05-30")
  await proceedToSpecificTimesGrid(page)
  await saveEditorAndWaitForPut(page, { action: "next" })

  let savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29, ...newDaySlots])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(sortIsoInstants(SLOT_UTC_MAY_29))

  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  editorCard = await openEditDialog(page)
  await clickDateCell(editorCard, "2026-05-28")
  await proceedToSpecificTimesGrid(page)
  await saveEditorAndWaitForPut(page, { action: "next" })

  savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_29, ...newDaySlots])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(sortIsoInstants(SLOT_UTC_MAY_29))
})
