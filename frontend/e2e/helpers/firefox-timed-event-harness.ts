import { firefox, type Locator, type Page, type Request, type Response } from "@playwright/test"
import { Temporal } from "temporal-polyfill"

export const APP_BASE_URL = process.env.NEW_APP_URL ?? "http://127.0.0.1:4173"
export const HOME_URL = `${APP_BASE_URL}/`
const VIEWPORT = { width: 1440, height: 1600 }

interface TimedEventCanonicalSummary {
  dates: string[]
  times: string[]
  enabledSlots: string[]
  activeSlots: string[]
  eventTimezone: string | null
  slotGeneration: unknown
  timedRecurrence: unknown
}

interface FetchedTimedEventSummary {
  shortId: string
  canonical: TimedEventCanonicalSummary
}

interface CreateSeedEventInput {
  name: string
  dates: string[]
  times: string[]
  enabledSlots?: string[]
  activeSlots?: string[]
  timeIncrement?: number
  duration?: number
}

interface DragRangeInput {
  startRow: number
  endRow: number
  col: number
}

interface CreateUiSpecificTimesEventInput {
  name: string
  dates: string[]
  initialDrag: DragRangeInput
}

interface SpecificTimesPageEvidence {
  headerColumns: string[]
  visibleDateStrings: string[]
}

interface EventPageEvidence {
  dateText: string
}

interface FirefoxScenarioContext {
  page: Page
}

type NetworkLogEntry =
  | {
      type: "request"
      url: string
      method: string
      postData: unknown
    }
  | {
      type: "response"
      url: string
      status: number
      body: unknown
    }

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
}

function readRequestPostData(request: Request): unknown {
  try {
    return request.postDataJSON()
  } catch {
    return request.postData() ?? null
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return response.text().catch(() => null)
  }
}

export function extractMonthDayLabels(text: string): string[] {
  const monthAliases: Record<string, string> = {
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "May",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Oct",
    nov: "Nov",
    dec: "Dec",
  }

  const matches: string[] = []
  const pattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/gi

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    const monthAlias = monthAliases[match[1].slice(0, 3).toLowerCase()]
    if (monthAlias) {
      matches.push(`${monthAlias} ${match[2]}`)
    }
  }

  return unique(matches)
}

export function extractNumericDates(text: string): string[] {
  return unique([...text.matchAll(/\b\d{1,2}\/\d{1,2}\b/g)].map((match) => match[0]))
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

export async function clickText(page: Page, selector: string, text: string): Promise<void> {
  await page.locator(selector).filter({ hasText: text }).first().click({ force: true })
}

export function getEditorCard(page: Page): Locator {
  return page
    .locator('input[placeholder="Name your event..."]')
    .first()
    .locator('xpath=ancestor::*[contains(@class,"v-card")][1]')
}

export async function assertTimezoneIsUtc(root: Locator): Promise<void> {
  const timezoneRow = root.locator("#timezone-select-container").first()
  const timezoneText = normalizeWhitespace((await timezoneRow.textContent()) ?? "")
  if (!/UTC/i.test(timezoneText)) {
    throw new Error(`Expected UTC editor timezone, got: ${JSON.stringify(timezoneText)}`)
  }
}

export async function fetchEventByShortId(
  _page: Page,
  shortId: string
): Promise<FetchedTimedEventSummary> {
  const response = await fetch(`${APP_BASE_URL}/api/events/${shortId}`)
  const body = asRecord(await response.json().catch(() => null))

  return {
    shortId,
    canonical: {
      dates: asStringArray(body.dates),
      times: asStringArray(body.times),
      enabledSlots: asStringArray(body.enabledSlots),
      activeSlots: asStringArray(body.activeSlots),
      eventTimezone: typeof body.eventTimezone === "string" ? body.eventTimezone : null,
      slotGeneration: body.slotGeneration ?? null,
      timedRecurrence: body.timedRecurrence ?? null,
    },
  }
}

export async function createSeedEvent({
  name,
  dates,
  times,
  enabledSlots = times,
  activeSlots = times,
  timeIncrement = 15,
  duration = 4,
}: CreateSeedEventInput): Promise<{ shortId: string }> {
  const response = await fetch(`${APP_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      duration,
      dates: dates.map((date) => `${date}T00:00:00.000Z`),
      type: "specific_dates",
      hasSpecificTimes: true,
      enabledSlots,
      activeSlots,
      times,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      remindees: [],
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement,
      creatorPosthogId: `repro-${String(Temporal.Now.instant().epochMilliseconds)}`,
    }),
  })

  const body = (await response.json().catch(() => null)) as { shortId?: string } | null
  if (!response.ok || !body?.shortId) {
    throw new Error(
      `Failed to create seed event: ${JSON.stringify({ status: response.status, body })}`
    )
  }

  return { shortId: body.shortId }
}

export async function openEventPage(page: Page, shortId: string): Promise<void> {
  await page.goto(`${HOME_URL}e/${shortId}`, { waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await page.waitForSelector("#event-header-meta-row")
}

export async function openEditDialog(page: Page): Promise<Locator> {
  await page.locator("#edit-event-btn").click({ force: true })
  const editorCard = getEditorCard(page)
  await editorCard.waitFor({ state: "visible" })

  const advancedOptionsButton = editorCard.getByRole("button", {
    name: /advanced options/i,
  })
  if (await advancedOptionsButton.isVisible().catch(() => false)) {
    await advancedOptionsButton.click({ force: true })
  }

  return editorCard
}

export async function setDateSelections(root: Locator, dates: string[]): Promise<void> {
  for (const date of dates) {
    await root.locator(`[data-v-date="${date}"]`).click()
  }
}

export async function enterSpecificTimesGrid(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
  await page.waitForSelector(".schedule-overlap-time-grid__header")
  await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')
}

export async function saveSpecificTimesGrid(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
  await page.waitForSelector("#event-header-meta-row")
}

export async function collectSpecificTimesPageEvidence(
  page: Page
): Promise<SpecificTimesPageEvidence> {
  return page.evaluate(() => {
    const headerColumns = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".schedule-overlap-time-grid__header .schedule-overlap-time-grid__day-column"
      )
    ).map((column) => column.textContent.replace(/\s+/g, " ").trim())

    const visibleDateStrings = Array.from(
      document.querySelectorAll<HTMLElement>(".schedule-overlap-time-grid__header .tw-text-\\[12px\\]")
    ).map((element) => element.textContent.replace(/\s+/g, " ").trim())

    return {
      headerColumns,
      visibleDateStrings,
    }
  })
}

export async function collectEventPageEvidence(page: Page): Promise<EventPageEvidence> {
  return page.evaluate(() => {
    const eventHeaderMeta = document.querySelector("#event-header-meta-row")
    const dateText = (eventHeaderMeta?.firstElementChild?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()

    return {
      dateText,
    }
  })
}

export function summarizeSpecificTimesEvidence(evidence: SpecificTimesPageEvidence): {
  headerColumns: string[]
  visibleDateStrings: string[]
  extractedMonthDays: string[]
} {
  const headerText = evidence.headerColumns.join(" | ")
  const visibleDateStrings = evidence.visibleDateStrings.map(normalizeWhitespace)
  return {
    headerColumns: evidence.headerColumns,
    visibleDateStrings,
    extractedMonthDays: unique([
      ...visibleDateStrings.flatMap(extractMonthDayLabels),
      ...extractMonthDayLabels(headerText),
    ]),
  }
}

export function summarizeEventPageEvidence(evidence: EventPageEvidence): {
  dateText: string
  numericDates: string[]
  monthDayLabels: string[]
} {
  return {
    dateText: evidence.dateText,
    numericDates: extractNumericDates(evidence.dateText),
    monthDayLabels: extractMonthDayLabels(evidence.dateText),
  }
}

export async function dragSpecificTimesRange(page: Page, { startRow, endRow, col }: DragRangeInput): Promise<void> {
  const start = page.locator(
    `#drag-section .timeslot[data-row="${String(startRow)}"][data-col="${String(col)}"]`
  )
  const end = page.locator(
    `#drag-section .timeslot[data-row="${String(endRow)}"][data-col="${String(col)}"]`
  )
  const startBox = await start.boundingBox()
  const endBox = await end.boundingBox()

  if (!startBox || !endBox) {
    throw new Error(`Missing drag targets for col=${String(col)} rows ${String(startRow)}-${String(endRow)}`)
  }

  await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 20 })
  await page.mouse.up()
}

export async function createUiSpecificTimesEvent(
  page: Page,
  { name, dates, initialDrag }: CreateUiSpecificTimesEventInput
): Promise<{ shortId: string; networkLog: NetworkLogEntry[] }> {
  await page.goto(HOME_URL, { waitUntil: "domcontentloaded" })
  await dismissConsent(page)
  await clickText(page, "button", "Create event")

  const editorCard = getEditorCard(page)
  await editorCard.waitFor({ state: "visible" })
  await editorCard.locator('input[placeholder="Name your event..."]').fill(name)
  await editorCard.getByTestId("specific-times-toggle").locator("input").check({ force: true })

  const advancedOptionsButton = editorCard.getByRole("button", {
    name: /advanced options/i,
  })
  if (await advancedOptionsButton.isVisible().catch(() => false)) {
    await advancedOptionsButton.click({ force: true })
  }

  await assertTimezoneIsUtc(editorCard)
  await setDateSelections(editorCard, dates)

  const networkLog = await withEventMutationLog(page, async () => {
    await page.getByRole("button", { name: /^Next$/ }).click({ force: true })
    await page.waitForURL(/\/e\//, { waitUntil: "domcontentloaded", timeout: 30000 })
    await dismissConsent(page)
    await page.waitForSelector('#drag-section .timeslot[data-row="0"][data-col="0"]')
    await dragSpecificTimesRange(page, initialDrag)
    await saveSpecificTimesGrid(page)
  })

  const shortId = page.url().split("/").filter(Boolean).at(-1)
  if (!shortId) {
    throw new Error("Missing event shortId after UI create flow")
  }

  return {
    shortId,
    networkLog,
  }
}

function isEventMutation(requestOrResponse: Request | Response): boolean {
  const request = "request" in requestOrResponse
    ? requestOrResponse.request()
    : requestOrResponse
  return ["POST", "PUT"].includes(request.method()) && request.url().includes("/api/events")
}

export async function withEventMutationLog<T>(
  page: Page,
  fn: () => Promise<T>
): Promise<NetworkLogEntry[]> {
  const networkLog: NetworkLogEntry[] = []

  const handleRequest = (request: Request): void => {
    if (!isEventMutation(request)) {
      return
    }

    networkLog.push({
      type: "request",
      url: request.url(),
      method: request.method(),
      postData: readRequestPostData(request),
    })
  }

  const handleResponse = async (response: Response): Promise<void> => {
    if (!isEventMutation(response)) {
      return
    }

    networkLog.push({
      type: "response",
      url: response.url(),
      status: response.status(),
      body: await readResponseBody(response),
    })
  }

  page.on("request", handleRequest)
  page.on("response", handleResponse)

  try {
    await fn()
  } finally {
    page.off("request", handleRequest)
    page.off("response", handleResponse)
  }

  return networkLog
}

export async function runFirefoxScenario<T extends Record<string, unknown>>(
  name: string,
  scenario: (context: FirefoxScenarioContext) => Promise<T>
): Promise<void> {
  const browser = await firefox.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT, timezoneId: "UTC" })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  try {
    const result = await scenario({ page })
    console.log(JSON.stringify({ scenario: name, ...result }, null, 2))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
