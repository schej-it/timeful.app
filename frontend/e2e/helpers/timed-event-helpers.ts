import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test"
import { Temporal } from "temporal-polyfill"

export interface CanonicalTimedSeedInput {
  name: string
  type: "specific_dates" | "weekly" | "group"
  enabledSlots: string[]
  activeSlots?: string[]
  eventTimezone: string
  slotGeneration: {
    startTimeLocal: string
    endTimeLocal: string
    timeIncrementMinutes: number
  }
  timedRecurrence: {
    kind: "specific_dates" | "weekly"
    selectedDays: string[]
    selectedDaysOfWeek: number[]
    startOnMonday: boolean
  }
  hasSpecificTimes?: boolean
  description?: string
}

export interface EventApiPayload {
  shortId: string
  name?: string
  type?: "specific_dates" | "weekly" | "group"
  dates?: string[]
  times?: string[]
  enabledSlots?: string[]
  activeSlots?: string[]
  eventTimezone?: string
  slotGeneration?: {
    startTimeLocal?: string
    endTimeLocal?: string
    timeIncrementMinutes?: number
  }
  timedRecurrence?: {
    kind?: "specific_dates" | "weekly"
    selectedDays?: string[]
    selectedDaysOfWeek?: number[]
    startOnMonday?: boolean
  }
}

export interface GridState {
  headerColumns: string[]
  visibleDateStrings: string[]
}

export interface SpecificDateSeedInput {
  name: string
  selectedDays: string[]
  enabledSlots: string[]
  activeSlots?: string[]
  hasSpecificTimes?: boolean
  eventTimezone: string
  startTimeLocal: string
  endTimeLocal: string
  timeIncrementMinutes: number
}

export interface CreateSpecificTimesEventOptions {
  timezone?: ChangeTimezoneOptions
}

export interface CreateSpecificTimesEventResult {
  shortId: string
  selectedDates: string[]
  createPayload: {
    activeSlots?: string[]
    enabledSlots?: string[]
  }
}

export interface DateCellState {
  date: string | null
  className: string
  ariaPressed: string | null
  buttonClassName: string
  buttonDisabled: boolean
  text: string
}

export interface ChangeTimezoneOptions {
  optionLabelPattern?: RegExp
  optionValue?: string
  currentSelectionPattern?: RegExp
}

export const SLOT_UTC_MAY_28 = [
  "2026-05-28T00:00:00Z",
  "2026-05-28T01:00:00Z",
  "2026-05-28T02:00:00Z",
  "2026-05-28T03:00:00Z",
]

export const SLOT_UTC_MAY_29 = [
  "2026-05-29T00:00:00Z",
  "2026-05-29T01:00:00Z",
  "2026-05-29T02:00:00Z",
  "2026-05-29T03:00:00Z",
]

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

export function normalizeWhitespace(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
}

function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message)
  }

  return value
}

function readCreatePayload(postData: unknown): { activeSlots?: string[]; enabledSlots?: string[] } {
  const record = asRecord(postData)
  const activeSlots = asStringArray(record.activeSlots)
  const enabledSlots = asStringArray(record.enabledSlots)

  return {
    activeSlots: activeSlots.length > 0 ? activeSlots : undefined,
    enabledSlots: enabledSlots.length > 0 ? enabledSlots : undefined,
  }
}

export function getEditorNameInput(page: Page): Locator {
  return page.locator(
    [
      'input[placeholder="Name your event..."]:visible',
      'input[placeholder="Name your group..."]:visible',
    ].join(", ")
  ).first()
}

export function getEditorCard(page: Page): Locator {
  return getEditorNameInput(page).locator(
    'xpath=ancestor::*[contains(@class,"v-card")][1]'
  )
}

function getEditorSubmitButton(page: Page): Locator {
  return page.locator(".new-event-submit-button")
}

function getGroupEditorSubmitButton(page: Page): Locator {
  return page.locator('button:visible').filter({ hasText: /^Save edits$/ }).last()
}

async function waitForEditorSubmitReady(button: Locator): Promise<void> {
  await expect
    .poll(
      async () =>
        button.evaluate((element) => {
          const htmlElement = element as HTMLButtonElement
          return (
            !htmlElement.disabled &&
            htmlElement.getAttribute("aria-disabled") !== "true"
          )
        }),
      { timeout: 30000 }
    )
    .toBe(true)
}

function getSpecificTimesGridNextButton(page: Page): Locator {
  return page.locator('[data-testid="specific-times-grid-next"]')
}

async function isSpecificTimesGridVisible(page: Page): Promise<boolean> {
  return getSpecificTimesGridNextButton(page).isVisible().catch(() => false)
}

function getSpecificTimesCheckbox(editorCard: Locator): Locator {
  return editorCard
    .getByTestId("specific-times-toggle")
    .locator("input")
}

function getSpecificTimesToggle(editorCard: Locator): Locator {
  return editorCard.getByTestId("specific-times-toggle").first()
}

async function isSpecificTimesEnabled(editorCard: Locator): Promise<boolean> {
  return getSpecificTimesCheckbox(editorCard).evaluate(
    (element) => (element as HTMLInputElement).checked
  )
}

export async function setSpecificTimesEnabled(
  editorCard: Locator,
  enabled: boolean
): Promise<void> {
  if ((await isSpecificTimesEnabled(editorCard)) === enabled) {
    return
  }

  const checkbox = getSpecificTimesCheckbox(editorCard)
  const toggle = getSpecificTimesToggle(editorCard)
  const selectionControl = toggle.locator(
    'xpath=ancestor::*[contains(@class,"v-selection-control")][1]'
  )

  const actions = enabled
    ? [
        async () => checkbox.check({ force: true }),
        async () => toggle.click({ force: true }),
        async () => selectionControl.click({ force: true }),
      ]
    : [
        async () => checkbox.uncheck({ force: true }),
        async () => toggle.click({ force: true }),
        async () => selectionControl.click({ force: true }),
      ]

  for (const action of actions) {
    await action().catch(() => undefined)
    if ((await isSpecificTimesEnabled(editorCard)) === enabled) {
      return
    }
  }

  await expect
    .poll(async () => isSpecificTimesEnabled(editorCard), {
      timeout: 5000,
    })
    .toBe(enabled)
}

async function ensureSpecificTimesEditorMode(page: Page, editorCard: Locator): Promise<void> {
  const editorSubmitButton = getEditorSubmitButton(page)
  if ((await editorSubmitButton.textContent())?.trim() === "Next") {
    return
  }

  if (!(await isSpecificTimesEnabled(editorCard))) {
    await setSpecificTimesEnabled(editorCard, true)
  }

  await expect(editorSubmitButton).toHaveText(/^Next$/)
}

export async function dismissConsent(page: Page): Promise<void> {
  const agree = page.getByRole("button", { name: /^agree$/i })

  try {
    await agree.waitFor({ state: "visible", timeout: 1500 })
    await agree.click({ force: true })
    await page.waitForTimeout(200)
  } catch {
    // Ignore pages without the consent dialog.
  }

  await page.evaluate(() => {
    document.getElementById("qc-cmp2-container")?.remove()
  })
}

function toMembershipSeed(day: string, timeZone: string, localStartTime: string): string {
  return Temporal.PlainDate
    .from(day)
    .toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from(localStartTime),
    })
    .withTimeZone("UTC")
    .toInstant()
    .toString()
}

function getDurationHours(startTimeLocal: string, endTimeLocal: string): number {
  const start = Temporal.PlainTime.from(startTimeLocal)
  const end = Temporal.PlainTime.from(endTimeLocal)
  const startMinutes = (start.hour * 60) + start.minute
  const endMinutes = (end.hour * 60) + end.minute
  const diffMinutes =
    endMinutes > startMinutes
      ? endMinutes - startMinutes
      : (24 * 60) - startMinutes + endMinutes

  return diffMinutes / 60
}

function buildSeedPayload(input: CanonicalTimedSeedInput) {
  const activeSlots = unique(input.activeSlots ?? input.enabledSlots)
  const enabledSlots = unique(input.enabledSlots)

  return {
    name: input.name,
    description: input.description,
    duration: getDurationHours(
      input.slotGeneration.startTimeLocal,
      input.slotGeneration.endTimeLocal
    ),
    dates: input.timedRecurrence.selectedDays.map((day) =>
      toMembershipSeed(day, input.eventTimezone, input.slotGeneration.startTimeLocal)
    ),
    type: input.type,
    hasSpecificTimes: input.hasSpecificTimes ?? true,
    times: activeSlots,
    enabledSlots,
    activeSlots,
    eventTimezone: input.eventTimezone,
    slotGeneration: input.slotGeneration,
    timedRecurrence: input.timedRecurrence,
    notificationsEnabled: false,
    blindAvailabilityEnabled: false,
    daysOnly: false,
    remindees: [],
    sendEmailAfterXResponses: -1,
    collectEmails: false,
    startOnMonday: input.timedRecurrence.startOnMonday,
    timeIncrement: input.slotGeneration.timeIncrementMinutes,
    creatorPosthogId: `playwright-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  }
}

export async function seedCanonicalTimedEvent(
  request: APIRequestContext,
  input: CanonicalTimedSeedInput
): Promise<{ shortId: string; eventId: string }> {
  const response = await request.post("/api/events", {
    data: buildSeedPayload(input),
  })

  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { shortId?: string; eventId?: string }
  const shortId = body.shortId
  const eventId = body.eventId

  expect(shortId).toBeTruthy()
  expect(eventId).toBeTruthy()

  return {
    shortId: assertDefined(shortId, "Seed event response missing shortId"),
    eventId: assertDefined(eventId, "Seed event response missing eventId"),
  }
}

export async function fetchEventByShortId(
  request: APIRequestContext,
  shortId: string
): Promise<EventApiPayload> {
  const response = await request.get(`/api/events/${shortId}`)
  expect(response.ok()).toBeTruthy()
  const rawEvent = asRecord(await response.json())
  const rawTimedRecurrence = asRecord(rawEvent.timedRecurrence)
  const rawSlotGeneration = asRecord(rawEvent.slotGeneration)

  return {
    shortId: typeof rawEvent.shortId === "string" ? rawEvent.shortId : shortId,
    name: typeof rawEvent.name === "string" ? rawEvent.name : undefined,
    type:
      rawEvent.type === "specific_dates" || rawEvent.type === "weekly" || rawEvent.type === "group"
        ? rawEvent.type
        : undefined,
    dates: asStringArray(rawEvent.dates),
    times: asStringArray(rawEvent.times),
    enabledSlots: asStringArray(rawEvent.enabledSlots),
    activeSlots: asStringArray(rawEvent.activeSlots),
    eventTimezone: typeof rawEvent.eventTimezone === "string" ? rawEvent.eventTimezone : undefined,
    slotGeneration: rawEvent.slotGeneration == null
      ? undefined
      : {
          startTimeLocal:
            typeof rawSlotGeneration.startTimeLocal === "string"
              ? rawSlotGeneration.startTimeLocal
              : undefined,
          endTimeLocal:
            typeof rawSlotGeneration.endTimeLocal === "string"
              ? rawSlotGeneration.endTimeLocal
              : undefined,
          timeIncrementMinutes:
            typeof rawSlotGeneration.timeIncrementMinutes === "number"
              ? rawSlotGeneration.timeIncrementMinutes
              : undefined,
        },
    timedRecurrence: rawEvent.timedRecurrence == null
      ? undefined
      : {
          kind:
            rawTimedRecurrence.kind === "specific_dates" || rawTimedRecurrence.kind === "weekly"
              ? rawTimedRecurrence.kind
              : undefined,
          selectedDays: asStringArray(rawTimedRecurrence.selectedDays),
          selectedDaysOfWeek: asNumberArray(rawTimedRecurrence.selectedDaysOfWeek),
          startOnMonday:
            typeof rawTimedRecurrence.startOnMonday === "boolean"
              ? rawTimedRecurrence.startOnMonday
              : undefined,
        },
  }
}

export async function openEventPage(page: Page, shortId: string): Promise<void> {
  await page.goto(`/e/${shortId}`, { waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await waitForEventShell(page)
}

export async function waitForEventShell(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return (
      document.querySelector("#edit-event-btn") != null ||
      document.querySelector("#event-header-meta-row") != null ||
      document.querySelector('#drag-section .timeslot[data-row="0"][data-col="0"]') != null
    )
  })
}

export async function waitForSpecificTimesGrid(page: Page): Promise<void> {
  await expect(getSpecificTimesGridNextButton(page)).toBeVisible({ timeout: 30000 })
  await page.waitForFunction(() => {
    const cells = document.querySelectorAll(
      '#drag-section .timeslot[data-row][data-col]'
    )
    return cells.length > 0
  })
}

export async function openEditDialog(page: Page): Promise<Locator> {
  await page.locator("#edit-event-btn").click({ force: true })
  const editorCard = getEditorCard(page)
  await editorCard.waitFor({ state: "visible" })
  return editorCard
}

export async function openSpecificTimesEditor(page: Page): Promise<void> {
  const editorCard = await openEditDialog(page)
  await revealAdvancedOptions(editorCard)
  await ensureSpecificTimesEditorMode(page, editorCard)
  await getEditorSubmitButton(page).click({ force: true })
  await waitForSpecificTimesGrid(page)
}

export async function revealAdvancedOptions(editorCard: Locator): Promise<void> {
  const advancedOptionsButton = editorCard.getByRole("button", {
    name: /advanced options/i,
  })

  if (await advancedOptionsButton.isVisible().catch(() => false)) {
    await advancedOptionsButton.click({ force: true })
  }
}

export async function clickDateCell(editorCard: Locator, date: string): Promise<void> {
  await editorCard
    .locator(`[data-v-date="${date}"]:visible button`)
    .first()
    .click({ force: true })
}

export async function collectDatePickerState(editorCard: Locator): Promise<DateCellState[]> {
  return editorCard.evaluate((card) =>
    Array.from(card.querySelectorAll("[data-v-date]")).map((element) => {
      const button = element.querySelector("button")
      return {
        date: element.getAttribute("data-v-date"),
        className: element.className,
        ariaPressed: element.getAttribute("aria-pressed"),
        buttonClassName: button?.className ?? "",
        buttonDisabled: button?.disabled ?? false,
        text: button?.textContent.replace(/\s+/g, " ").trim() ?? "",
      }
    })
  )
}

export async function createSpecificTimesEventFromDialog(
  page: Page,
  name: string,
  options?: CreateSpecificTimesEventOptions
): Promise<CreateSpecificTimesEventResult> {
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await page.getByRole("button", { name: /create event/i }).first().click({ force: true })

  const editorCard = getEditorCard(page)
  await editorCard.waitFor({ state: "visible" })
  await getEditorNameInput(page).fill(name)
  await revealAdvancedOptions(editorCard)
  if (options?.timezone) {
    await changeTimezone(page, options.timezone)
  }
  const nextButton = getEditorSubmitButton(page)
  await ensureSpecificTimesEditorMode(page, editorCard)
  const selectedDatesPromise = collectDatePickerState(editorCard).then((cells) =>
    cells
      .filter(
        (cell) =>
          cell.date != null &&
          !cell.buttonDisabled &&
          !cell.className.includes("v-date-picker-month__day--adjacent")
      )
      .slice(0, 2)
      .flatMap((cell) => (cell.date == null ? [] : [cell.date]))
  )
  for (const date of await selectedDatesPromise) {
    await clickDateCell(editorCard, date)
  }

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/events"),
    { timeout: 30000 }
  )

  await waitForEditorSubmitReady(nextButton)
  await nextButton.click({ force: true })
  const createResponse = await createResponsePromise
  expect(createResponse.ok()).toBeTruthy()
  await page.waitForURL(/\/e\//, { waitUntil: "domcontentloaded", timeout: 30000 })
  await dismissConsent(page)
  await waitForSpecificTimesGrid(page)

  return {
    shortId: extractShortIdFromUrl(page.url()),
    selectedDates: await selectedDatesPromise,
    createPayload: readCreatePayload(createResponse.request().postDataJSON()),
  }
}

export function selectedDatesFromState(cells: DateCellState[]): string[] {
  return cells
    .filter((cell) =>
      cell.ariaPressed === "true" ||
      cell.className.includes("v-date-picker-month__day--selected") ||
      cell.buttonClassName.includes("v-btn--variant-flat")
    )
    .flatMap((cell) => (cell.date ? [cell.date] : []))
}

export async function proceedToSpecificTimesGrid(page: Page): Promise<void> {
  const editorCard = getEditorCard(page)
  const editorVisible = await editorCard.isVisible().catch(() => false)

  if (editorVisible) {
    if (await getEditorSubmitButton(page).isVisible().catch(() => false)) {
      await ensureSpecificTimesEditorMode(page, editorCard)
      await waitForEditorSubmitReady(getEditorSubmitButton(page))
      await getEditorSubmitButton(page).click({ force: true })
    }
  }

  await waitForSpecificTimesGrid(page)
}

export async function saveEditorAndWaitForPut(
  page: Page,
  options?: { action?: "next" | "save" }
): Promise<void> {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/api/events/"),
    { timeout: 30000 }
  )

  const editorSubmitButton = getEditorSubmitButton(page)
  const groupSubmitButton = getGroupEditorSubmitButton(page)
  const gridNextButton = getSpecificTimesGridNextButton(page)
  if (options?.action === "save") {
    if (await editorSubmitButton.isVisible().catch(() => false)) {
      await expect(editorSubmitButton).toHaveText(/^Save edits$/)
      await waitForEditorSubmitReady(editorSubmitButton)
      await editorSubmitButton.click({ force: true })
    } else {
      await expect(groupSubmitButton).toBeVisible()
      await waitForEditorSubmitReady(groupSubmitButton)
      await groupSubmitButton.click({ force: true })
    }
  } else if (options?.action === "next") {
    if (await isSpecificTimesGridVisible(page)) {
      await gridNextButton.click({ force: true })
    } else if (
      await editorSubmitButton
        .filter({ hasText: /^Save edits$/ })
        .isVisible()
        .catch(() => false)
    ) {
      await waitForEditorSubmitReady(editorSubmitButton)
      await editorSubmitButton.click({ force: true })
    } else if (await groupSubmitButton.isVisible().catch(() => false)) {
      await waitForEditorSubmitReady(groupSubmitButton)
      await groupSubmitButton.click({ force: true })
    } else {
      await expect(editorSubmitButton).toHaveText(/^Next$/)
      await waitForEditorSubmitReady(editorSubmitButton)
      await editorSubmitButton.click({ force: true })
    }
  } else if (
    await editorSubmitButton
      .filter({ hasText: /^Save edits$/ })
      .isVisible()
      .catch(() => false)
  ) {
    await waitForEditorSubmitReady(editorSubmitButton)
    await editorSubmitButton.click({ force: true })
  } else if (await isSpecificTimesGridVisible(page)) {
    await gridNextButton.click({ force: true })
  } else {
    await waitForEditorSubmitReady(editorSubmitButton)
    await editorSubmitButton.click({ force: true })
  }
  const saveResponse = await saveResponsePromise
  expect(saveResponse.ok()).toBeTruthy()
  await waitForEventShell(page)
}

export async function dragSelectGridRange(
  page: Page,
  coords: {
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }
): Promise<void> {
  const start = page.locator(
    `#drag-section .timeslot[data-row="${String(coords.startRow)}"][data-col="${String(coords.startCol)}"]`
  )
  const end = page.locator(
    `#drag-section .timeslot[data-row="${String(coords.endRow)}"][data-col="${String(coords.endCol)}"]`
  )
  const startBox = await start.boundingBox()
  const endBox = await end.boundingBox()

  expect(startBox).not.toBeNull()
  expect(endBox).not.toBeNull()
  const dragStartBox = assertDefined(startBox, "Missing start box for specific-times drag")
  const dragEndBox = assertDefined(endBox, "Missing end box for specific-times drag")

  await page.mouse.move(
    dragStartBox.x + dragStartBox.width / 2,
    dragStartBox.y + dragStartBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(dragEndBox.x + dragEndBox.width / 2, dragEndBox.y + dragEndBox.height / 2, {
    steps: 20,
  })
  await page.mouse.up()
}

export async function collectGridState(page: Page): Promise<GridState> {
  return page.evaluate(() => {
    const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim()
    const headerColumns = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".schedule-overlap-time-grid__header .schedule-overlap-time-grid__day-column"
      )
    ).map((column) => normalizeText(column.textContent))

    const visibleDateStrings = Array.from(
      document.querySelectorAll<HTMLElement>(".schedule-overlap-time-grid__header .tw-text-\\[12px\\]")
    ).map((element) => normalizeText(element.textContent))

    const weekdayOnlyHeaders = headerColumns.every((column) =>
      /^(sun|mon|tue|wed|thu|fri|sat)$/i.test(column)
    )
    const normalizedVisibleDateStrings = weekdayOnlyHeaders
      ? visibleDateStrings.map((value) => {
          const match = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})$/i.exec(
            value
          )
          if (!match) {
            return value
          }

          const monthIndex = [
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
          ].indexOf(match[1].toLowerCase())
          return monthIndex >= 0 ? `${String(monthIndex + 1)}/${match[2]}` : value
        })
      : visibleDateStrings

    return {
      headerColumns,
      visibleDateStrings: normalizedVisibleDateStrings,
    }
  })
}

export async function readGridCellState(
  page: Page,
  row: number,
  col: number
): Promise<{ className: string; backgroundColor: string }> {
  return page.locator(
    `#drag-section .timeslot[data-row="${String(row)}"][data-col="${String(col)}"]`
  ).evaluate((element) => {
    const htmlElement = element as HTMLElement
    return {
      className: htmlElement.className,
      backgroundColor: window.getComputedStyle(htmlElement).backgroundColor,
    }
  })
}

export async function countGridCellsByClass(page: Page, classFragment: string): Promise<number> {
  return page.locator(`#drag-section .timeslot.${classFragment}`).count()
}

export function rowIndexForTime(hour: number, minute: number, incrementMinutes = 15): number {
  return ((hour * 60) + minute) / incrementMinutes
}

function normalizeTimezoneSelectionText(text: string | null | undefined): string {
  return normalizeWhitespace(text)
}

async function readTimezoneSelectionText(editorCard: Locator): Promise<string> {
  return normalizeTimezoneSelectionText(
    await editorCard.locator(".timezone-select__selection-text").textContent()
  )
}

function getTimezoneTriggerRoot(editorCard: Locator): Locator {
  return editorCard.getByTestId("timezone-select-trigger").first()
}

function getTimezoneTrigger(editorCard: Locator): Locator {
  return getTimezoneTriggerRoot(editorCard).getByRole("combobox").first()
}

function getActiveTimezoneOptions(page: Page): Locator {
  return page.locator(
    '.v-overlay-container .v-overlay--active [data-testid="timezone-select-option"]:visible'
  )
}

function getAnyVisibleTimezoneOptions(page: Page): Locator {
  return page.locator('[data-testid="timezone-select-option"]:visible')
}

export async function changeTimezone(
  page: Page,
  options: RegExp | ChangeTimezoneOptions
): Promise<void> {
  const editorCard = getEditorCard(page)
  const timezoneSelectRoot = getTimezoneTriggerRoot(editorCard)
  const timezoneSelect = getTimezoneTrigger(editorCard)
  const normalizedOptions: ChangeTimezoneOptions =
    options instanceof RegExp
      ? { optionLabelPattern: options }
      : options

  if (!(await timezoneSelect.isVisible().catch(() => false))) {
    const advancedOptionsButton = editorCard.getByRole("button", {
      name: /advanced options/i,
    })
    if (await advancedOptionsButton.isVisible().catch(() => false)) {
      await advancedOptionsButton.click({ force: true })
    }
    await expect(timezoneSelectRoot).toBeVisible({ timeout: 30000 })
  }

  await timezoneSelectRoot.scrollIntoViewIfNeeded()

  if (!(await timezoneSelect.isVisible().catch(() => false))) {
    await expect(timezoneSelect).toBeVisible({ timeout: 30000 })
  }

  const selectionTextBeforeOpen = await readTimezoneSelectionText(editorCard)
  expect(selectionTextBeforeOpen).not.toBe("")
  if (normalizedOptions.currentSelectionPattern) {
    expect(selectionTextBeforeOpen).toMatch(normalizedOptions.currentSelectionPattern)
  }

  for (const openAction of [
    async () => timezoneSelectRoot.click({ force: true }),
    async () => timezoneSelect.click({ force: true }),
    async () => timezoneSelect.press("ArrowDown"),
    async () => timezoneSelect.press("Enter"),
    async () => timezoneSelect.press(" "),
  ]) {
    if ((await getActiveTimezoneOptions(page).count()) > 0) {
      break
    }
    await openAction()
    await page.waitForTimeout(150)
  }
  await expect
    .poll(
      async () =>
        Math.max(
          await getActiveTimezoneOptions(page).count(),
          await getAnyVisibleTimezoneOptions(page).count()
        ),
      { timeout: 15000 }
    )
    .toBeGreaterThan(0)
  const timezoneItems =
    (await getActiveTimezoneOptions(page).count()) > 0
      ? getActiveTimezoneOptions(page)
      : getAnyVisibleTimezoneOptions(page)

  let chosenItem: Locator | null = null
  if (normalizedOptions.optionValue) {
    const optionByValue = page.locator(
      `[data-testid="timezone-select-option"][data-timezone-value="${normalizedOptions.optionValue}"]:visible`
    )
    if ((await optionByValue.count()) > 0) {
      chosenItem = optionByValue.first()
    }
  }

  if (!chosenItem && normalizedOptions.optionLabelPattern) {
    const optionCount = await timezoneItems.count()
    for (let index = 0; index < optionCount; index += 1) {
      const item = timezoneItems.nth(index)
      const titleText = normalizeTimezoneSelectionText(
        await item.locator(".timezone-select__item-title").textContent()
      )
      if (normalizedOptions.optionLabelPattern.test(titleText)) {
        chosenItem = item
        break
      }
    }
  }

  expect(chosenItem, "Expected to find timezone option").not.toBeNull()
  const timezoneOption = assertDefined(chosenItem, "Expected to find timezone option")
  const chosenLabel = normalizeTimezoneSelectionText(
    await timezoneOption.locator(".timezone-select__item-title").textContent()
  )
  await timezoneOption.click({ force: true })

  if (normalizedOptions.optionLabelPattern) {
    await expect
      .poll(async () => readTimezoneSelectionText(editorCard))
      .toMatch(normalizedOptions.optionLabelPattern)
  } else if (normalizedOptions.optionValue) {
    await expect
      .poll(async () => readTimezoneSelectionText(editorCard))
      .not.toBe(selectionTextBeforeOpen)
  }
  await expect
    .poll(async () => readTimezoneSelectionText(editorCard))
    .toBe(chosenLabel)
}

export function sortIsoInstants(values: string[] | undefined): string[] {
  return [...(values ?? [])].sort()
}

export function extractShortIdFromUrl(urlString: string): string {
  const url = new URL(urlString)
  const segment = url.pathname.split("/").filter(Boolean).at(-1)
  if (!segment) {
    throw new Error(`Could not extract shortId from URL: ${urlString}`)
  }

  return segment
}

export function buildUtcSpecificTimesRangeInstants(input: {
  day: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  incrementMinutes?: number
}): string[] {
  const incrementMinutes = input.incrementMinutes ?? 15
  const instants: string[] = []
  let current = Temporal.PlainDate
    .from(input.day)
    .toZonedDateTime({
      timeZone: "UTC",
      plainTime: Temporal.PlainTime.from({
        hour: input.startHour,
        minute: input.startMinute,
      }),
    })
  const endExclusive = Temporal.PlainDate
    .from(input.day)
    .toZonedDateTime({
      timeZone: "UTC",
      plainTime: Temporal.PlainTime.from({
        hour: input.endHour,
        minute: input.endMinute,
      }),
    })
    .add({ minutes: incrementMinutes })

  while (Temporal.ZonedDateTime.compare(current, endExclusive) < 0) {
    instants.push(current.toInstant().toString())
    current = current.add({ minutes: incrementMinutes })
  }

  return instants
}

export function buildSpecificDateSeed(input: SpecificDateSeedInput): CanonicalTimedSeedInput {
  return {
    name: input.name,
    type: "specific_dates",
    enabledSlots: input.enabledSlots,
    activeSlots: input.activeSlots,
    eventTimezone: input.eventTimezone,
    slotGeneration: {
      startTimeLocal: input.startTimeLocal,
      endTimeLocal: input.endTimeLocal,
      timeIncrementMinutes: input.timeIncrementMinutes,
    },
    timedRecurrence: {
      kind: "specific_dates",
      selectedDays: input.selectedDays,
      selectedDaysOfWeek: [],
      startOnMonday: true,
    },
    hasSpecificTimes: input.hasSpecificTimes ?? true,
  }
}
