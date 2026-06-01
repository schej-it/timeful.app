import { expect, test } from "@playwright/test"
import {
  buildUtcSpecificTimesRangeInstants,
  countGridCellsByClass,
  createSpecificTimesEventFromDialog,
  dismissConsent,
  dragSelectGridRange,
  fetchEventByShortId,
  openEventPage,
  openSpecificTimesEditor,
  readGridCellState,
  rowIndexForTime,
  saveEditorAndWaitForPut,
  sortIsoInstants,
} from "./helpers/timed-event-helpers"
import { Temporal } from "temporal-polyfill"

test.describe.configure({ mode: "serial" })

test("create flow with specific-times lands directly in the specific-times grid", async ({
  page,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Create flow handoff ${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  expect(created.createPayload.activeSlots).toEqual([])
  expect((created.createPayload.enabledSlots ?? []).length).toBeGreaterThan(0)
  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(0)
  expect(await countGridCellsByClass(page, "tw-bg-gray")).toBeGreaterThan(0)
})

test("create specific-times saves and reopens the canonical active subset instead of the full domain", async ({
  page,
  request,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Create subset ${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  await dragSelectGridRange(page, {
    startRow: rowIndexForTime(9, 0),
    startCol: 0,
    endRow: rowIndexForTime(10, 45),
    endCol: 0,
  })
  await saveEditorAndWaitForPut(page, { action: "next" })

  const savedEvent = await fetchEventByShortId(request, created.shortId)
  const expectedActiveSlots = created.createPayload.enabledSlots?.slice(0, 8) ?? []
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(expectedActiveSlots)
  )
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants(created.createPayload.enabledSlots ?? [])
  )

  await openEventPage(page, created.shortId)
  await openSpecificTimesEditor(page)
  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(
    expectedActiveSlots.length
  )
  expect((await readGridCellState(page, rowIndexForTime(11, 0), 0)).className).toContain(
    "tw-bg-gray"
  )
})

test("create specific-times saves the exact visible UTC grid selection instead of failing normalization", async ({
  page,
  request,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Create visible UTC subset ${String(Temporal.Now.instant().epochMilliseconds)}`,
    {
      timezone: {
        optionValue: "UTC",
        optionLabelPattern: /\(GMT\+0:00\).*UTC/i,
      },
    }
  )

  const selectedGridInstants = buildUtcSpecificTimesRangeInstants({
    day: created.selectedDates[0],
    startHour: 9,
    startMinute: 0,
    endHour: 10,
    endMinute: 45,
  })

  await dragSelectGridRange(page, {
    startRow: rowIndexForTime(9, 0),
    startCol: 0,
    endRow: rowIndexForTime(10, 45),
    endCol: 0,
  })

  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(
    selectedGridInstants.length
  )

  await saveEditorAndWaitForPut(page, { action: "next" })

  await expect(
    page.getByText("Select at least one time before saving.")
  ).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`/e/${created.shortId}$`))

  const savedEvent = await fetchEventByShortId(request, created.shortId)
  expect(selectedGridInstants.length).toBeGreaterThan(0)
  expect(sortIsoInstants(created.createPayload.enabledSlots)).toEqual(
    sortIsoInstants([
      ...buildUtcSpecificTimesRangeInstants({
        day: created.selectedDates[0],
        startHour: 9,
        startMinute: 0,
        endHour: 16,
        endMinute: 45,
      }),
      ...buildUtcSpecificTimesRangeInstants({
        day: created.selectedDates[1],
        startHour: 9,
        startMinute: 0,
        endHour: 16,
        endMinute: 45,
      }),
    ])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(selectedGridInstants)
  )
  expect(
    selectedGridInstants.every((instant) =>
      (created.createPayload.enabledSlots ?? []).includes(instant)
    )
  ).toBe(true)
  expect(
    savedEvent.activeSlots?.every((instant) =>
      (savedEvent.enabledSlots ?? []).includes(instant)
    ) ?? false
  ).toBe(true)
  expect(savedEvent.activeSlots?.length ?? 0).toBeGreaterThan(0)
})

test("anonymous specific-times create flow survives save, reload, and reopen with canonical slots intact", async ({
  page,
  request,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Anonymous create reload ${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  await dragSelectGridRange(page, {
    startRow: rowIndexForTime(9, 0),
    startCol: 0,
    endRow: rowIndexForTime(10, 45),
    endCol: 0,
  })
  await saveEditorAndWaitForPut(page, { action: "next" })

  const expectedActiveSlots = created.createPayload.enabledSlots?.slice(0, 8) ?? []
  let savedEvent = await fetchEventByShortId(request, created.shortId)
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(expectedActiveSlots)
  )
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants(created.createPayload.enabledSlots ?? [])
  )

  await page.reload({ waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await openSpecificTimesEditor(page)
  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(
    expectedActiveSlots.length
  )

  await saveEditorAndWaitForPut(page, { action: "next" })
  savedEvent = await fetchEventByShortId(request, created.shortId)
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(expectedActiveSlots)
  )
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants(created.createPayload.enabledSlots ?? [])
  )
})

test("create specific-times without grid edits persists the full enabled domain as the saved active subset", async ({
  page,
  request,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Create untouched ${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  const savedEvent = await fetchEventByShortId(request, created.shortId)
  expect(sortIsoInstants(savedEvent.enabledSlots)).toEqual(
    sortIsoInstants(created.createPayload.enabledSlots ?? [])
  )
  expect(sortIsoInstants(savedEvent.activeSlots)).toEqual(
    sortIsoInstants(created.createPayload.enabledSlots ?? [])
  )

  await openEventPage(page, created.shortId)
  await openSpecificTimesEditor(page)
  expect(await countGridCellsByClass(page, "tw-bg-white")).toBe(
    (created.createPayload.enabledSlots ?? []).length
  )
})

test("selecting midnight slots outside the default 9-5 enabled range saves without error", async ({
  page,
}) => {
  const created = await createSpecificTimesEventFromDialog(
    page,
    `Midnight outside 9-5 ${String(Temporal.Now.instant().epochMilliseconds)}`
  )

  await dragSelectGridRange(page, {
    startRow: rowIndexForTime(0, 0),
    startCol: 0,
    endRow: rowIndexForTime(1, 0),
    endCol: 1,
  })

  await saveEditorAndWaitForPut(page, { action: "next" })

  await expect(
    page.getByText("Select at least one time before saving.")
  ).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`/e/${created.shortId}$`))
})
