import { expect, test, type APIRequestContext, type Page } from "@playwright/test"
import {
  SLOT_UTC_MAY_28,
  SLOT_UTC_MAY_29,
  buildSpecificDateSeed,
  changeTimezone,
  collectDatePickerState,
  collectGridState,
  countGridCellsByClass,
  dismissConsent,
  fetchEventByShortId,
  openEditDialog,
  openEventPage,
  proceedToSpecificTimesGrid,
  readGridCellState,
  revealAdvancedOptions,
  saveEditorAndWaitForPut,
  seedCanonicalTimedEvent,
  selectedDatesFromState,
  setSpecificTimesEnabled,
  sortIsoInstants,
  type CanonicalTimedSeedInput,
} from "./helpers/timed-event-helpers"
import { Temporal } from "temporal-polyfill"

test.describe.configure({ mode: "serial" })

test("reprojects a canonical timed event with the same slot window after reload", async ({
  page,
  request,
}) => {
  const selectedDays = ["2026-06-02", "2026-06-03"]
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: `Seeded timed event ${String(Temporal.Now.instant().epochMilliseconds)}`,
      selectedDays,
      enabledSlots: [
        "2026-06-02T09:00:00Z",
        "2026-06-02T09:15:00Z",
        "2026-06-02T09:30:00Z",
        "2026-06-02T09:45:00Z",
        "2026-06-02T10:00:00Z",
        "2026-06-02T10:15:00Z",
        "2026-06-02T10:30:00Z",
        "2026-06-02T10:45:00Z",
        "2026-06-02T11:00:00Z",
        "2026-06-02T11:15:00Z",
        "2026-06-02T11:30:00Z",
        "2026-06-02T11:45:00Z",
        "2026-06-02T12:00:00Z",
        "2026-06-02T12:15:00Z",
        "2026-06-02T12:30:00Z",
        "2026-06-02T12:45:00Z",
        "2026-06-02T13:00:00Z",
        "2026-06-02T13:15:00Z",
        "2026-06-02T13:30:00Z",
        "2026-06-02T13:45:00Z",
        "2026-06-02T14:00:00Z",
        "2026-06-02T14:15:00Z",
        "2026-06-02T14:30:00Z",
        "2026-06-02T14:45:00Z",
        "2026-06-02T15:00:00Z",
        "2026-06-02T15:15:00Z",
        "2026-06-02T15:30:00Z",
        "2026-06-02T15:45:00Z",
        "2026-06-02T16:00:00Z",
        "2026-06-02T16:15:00Z",
        "2026-06-02T16:30:00Z",
        "2026-06-02T16:45:00Z",
        "2026-06-03T09:00:00Z",
        "2026-06-03T09:15:00Z",
        "2026-06-03T09:30:00Z",
        "2026-06-03T09:45:00Z",
        "2026-06-03T10:00:00Z",
        "2026-06-03T10:15:00Z",
        "2026-06-03T10:30:00Z",
        "2026-06-03T10:45:00Z",
        "2026-06-03T11:00:00Z",
        "2026-06-03T11:15:00Z",
        "2026-06-03T11:30:00Z",
        "2026-06-03T11:45:00Z",
        "2026-06-03T12:00:00Z",
        "2026-06-03T12:15:00Z",
        "2026-06-03T12:30:00Z",
        "2026-06-03T12:45:00Z",
        "2026-06-03T13:00:00Z",
        "2026-06-03T13:15:00Z",
        "2026-06-03T13:30:00Z",
        "2026-06-03T13:45:00Z",
        "2026-06-03T14:00:00Z",
        "2026-06-03T14:15:00Z",
        "2026-06-03T14:30:00Z",
        "2026-06-03T14:45:00Z",
        "2026-06-03T15:00:00Z",
        "2026-06-03T15:15:00Z",
        "2026-06-03T15:30:00Z",
        "2026-06-03T15:45:00Z",
        "2026-06-03T16:00:00Z",
        "2026-06-03T16:15:00Z",
        "2026-06-03T16:30:00Z",
        "2026-06-03T16:45:00Z",
      ],
      eventTimezone: "UTC",
      startTimeLocal: "09:00:00",
      endTimeLocal: "17:00:00",
      timeIncrementMinutes: 15,
      hasSpecificTimes: false,
    })
  )
  const savedEvent = await fetchEventByShortId(request, seeded.shortId)

  expect(savedEvent.timedRecurrence).toMatchObject({
    kind: "specific_dates",
    selectedDays,
    selectedDaysOfWeek: [],
  })
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(sortIsoInstants(savedEvent.activeSlots))
  expect(savedEvent.slotGeneration).toMatchObject({
    startTimeLocal: "09:00:00",
    endTimeLocal: "17:00:00",
    timeIncrementMinutes: 15,
  })

  await openEventPage(page, seeded.shortId)
  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  const editorCard = await openEditDialog(page)
  const selectedDates = selectedDatesFromState(await collectDatePickerState(editorCard))
  expect(selectedDates).toEqual(selectedDays)

  await setSpecificTimesEnabled(editorCard, true)
  await proceedToSpecificTimesGrid(page)

  const gridState = await collectGridState(page)
  expect(gridState.headerColumns).toEqual([
    expect.stringMatching(/jun/i),
    expect.stringMatching(/jun/i),
  ])
  expect(gridState.visibleDateStrings).toEqual([
    expect.stringMatching(/^jun 2$/i),
    expect.stringMatching(/^jun 3$/i),
  ])
  expect(
    ((await page.locator("#time-row-0").textContent()) ?? "").replace(/\s+/g, " ").trim()
  ).toBe("12 am")
  expect(
    ((await page.locator("#time-row-36").textContent()) ?? "").replace(/\s+/g, " ").trim()
  ).toBe("9 am")
  expect(
    ((await page.locator("#time-row-64").textContent()) ?? "").replace(/\s+/g, " ").trim()
  ).toBe("4 pm")

  expect((await readGridCellState(page, 0, 0)).className).toContain("tw-bg-gray")
  expect((await readGridCellState(page, 36, 0)).className).toContain("tw-bg-white")
  expect((await readGridCellState(page, 67, 1)).className).toContain("tw-bg-white")
  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(64)
})

test("preserves timed instants when the event timezone changes and shifts projected local days", async ({
  page,
  request,
}) => {
  const enabledSlots = [
    "2026-01-05T07:30:00Z",
    "2026-01-05T08:00:00Z",
    "2026-01-05T08:30:00Z",
    "2026-01-05T09:00:00Z",
  ]
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: "Timezone preservation regression",
      selectedDays: ["2026-01-04"],
      enabledSlots,
      eventTimezone: "America/Los_Angeles",
      startTimeLocal: "23:30:00",
      endTimeLocal: "01:30:00",
      timeIncrementMinutes: 30,
    })
  )

  await openEventPage(page, seeded.shortId)
  const editorCard = await openEditDialog(page)
  await revealAdvancedOptions(editorCard)
  await changeTimezone(page, {
    currentSelectionPattern: /\(GMT-8:00\)|America\/Los_Angeles|Pacific/i,
    optionValue: "UTC",
    optionLabelPattern: /\(GMT\+0:00\).*UTC/i,
  })
  await proceedToSpecificTimesGrid(page)
  await saveEditorAndWaitForPut(page, { action: "next" })

  const savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(savedEvent.eventTimezone).toMatch(/UTC|GMT/)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(sortIsoInstants(enabledSlots))
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(sortIsoInstants(enabledSlots))

  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  const reopenedEditor = await openEditDialog(page)
  const selectedDates = selectedDatesFromState(await collectDatePickerState(reopenedEditor))
  expect(selectedDates).toEqual(["2026-01-05"])
})

test("event-page summary reflects enabled days for specific-date timed subset events", async ({
  page,
  request,
}) => {
  const seeded = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: "Subset summary regression",
      selectedDays: ["2026-05-28"],
      enabledSlots: [...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29],
      activeSlots: [...SLOT_UTC_MAY_29],
      eventTimezone: "UTC",
      startTimeLocal: "00:00:00",
      endTimeLocal: "04:00:00",
      timeIncrementMinutes: 60,
    })
  )

  await openEventPage(page, seeded.shortId)
  await expect(page.locator("#event-header-meta-row")).toContainText("5/28 - 5/29")

  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await expect(page.locator("#event-header-meta-row")).toContainText("5/28 - 5/29")

  const savedEvent = await fetchEventByShortId(request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants([...SLOT_UTC_MAY_28, ...SLOT_UTC_MAY_29])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(SLOT_UTC_MAY_29)
  )
})

test("reopens cross-midnight fixture without dropping membership days or drifting instants", async ({
  page,
  request,
}) => {
  const seed = buildSpecificDateSeed({
    name: "Cross-midnight timed fixture",
    selectedDays: ["2026-01-05"],
    enabledSlots: [
      "2026-01-05T23:00:00Z",
      "2026-01-05T23:30:00Z",
      "2026-01-06T00:00:00Z",
      "2026-01-06T00:30:00Z",
    ],
    eventTimezone: "UTC",
    startTimeLocal: "23:00:00",
    endTimeLocal: "01:00:00",
    timeIncrementMinutes: 30,
  })

  await expectTimedFixtureReopen({
    page,
    request,
    seed,
    expectedSelectedDays: ["2026-01-05"],
  })
})

test("reopens DST-boundary fixture without dropping membership days or drifting instants", async ({
  page,
  request,
}) => {
  const seed = buildSpecificDateSeed({
    name: "DST-boundary timed fixture",
    selectedDays: ["2026-03-08"],
    enabledSlots: [
      "2026-03-08T09:30:00Z",
      "2026-03-08T10:00:00Z",
      "2026-03-08T10:15:00Z",
    ],
    eventTimezone: "America/Los_Angeles",
    startTimeLocal: "01:30:00",
    endTimeLocal: "03:30:00",
    timeIncrementMinutes: 15,
  })

  await expectTimedFixtureReopen({
    page,
    request,
    seed,
    expectedSelectedDays: ["2026-03-08"],
  })
})

async function expectTimedFixtureReopen(input: {
  page: Page
  request: APIRequestContext
  seed: CanonicalTimedSeedInput
  expectedSelectedDays: string[]
}) {
  const seeded = await seedCanonicalTimedEvent(input.request, input.seed)
  await openEventPage(input.page, seeded.shortId)
  const editorCard = await openEditDialog(input.page)
  const selectedDates = selectedDatesFromState(await collectDatePickerState(editorCard))
  expect(selectedDates).toEqual(input.expectedSelectedDays)

  await proceedToSpecificTimesGrid(input.page)
  const gridState = await collectGridState(input.page)
  expect(gridState.headerColumns.length).toBe(input.expectedSelectedDays.length)
  expect(new Set(gridState.headerColumns).size).toBe(gridState.headerColumns.length)

  const enabledBeforeSave = sortIsoInstants(input.seed.enabledSlots)
  const activeBeforeSave = sortIsoInstants(input.seed.activeSlots ?? input.seed.enabledSlots)
  await saveEditorAndWaitForPut(input.page, { action: "next" })

  const savedEvent = await fetchEventByShortId(input.request, seeded.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(enabledBeforeSave)
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(activeBeforeSave)
}
