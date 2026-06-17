import { openNewEventDialog } from "./helpers.js"

import type { AppLabel } from "../types.js"
import type { ScenarioDefinition } from "../types.js"

const SELECTED_DATE = "2026-05-15"
const HOVER_DATE = "2026-05-16"

function dateDay(date: string) {
  return String(Number(date.split("-")[2]))
}

async function clickCalendarDate(page: import("@playwright/test").Page, label: AppLabel, date: string) {
  if (label.name === "new") {
    await page.locator(`[data-v-date="${date}"]`).click()
    return
  }

  await page
    .locator(".v-date-picker-table button")
    .filter({ has: page.locator(".v-btn__content", { hasText: new RegExp(`^${dateDay(date)}$`) }) })
    .first()
    .click()
}

async function hoverCalendarDate(page: import("@playwright/test").Page, label: AppLabel, date: string) {
  if (label.name === "new") {
    await page.locator(`[data-v-date="${date}"]`).hover()
    return
  }

  await page
    .locator(".v-date-picker-table button")
    .filter({ has: page.locator(".v-btn__content", { hasText: new RegExp(`^${dateDay(date)}$`) }) })
    .first()
    .hover()
}

async function collectSelectedDates(page: import("@playwright/test").Page, label: AppLabel) {
  if (label.name === "new") {
    return page.$$eval(".v-date-picker-month__day--selected[data-v-date]", (nodes) =>
      nodes
        .map((node) => (node instanceof HTMLElement ? node.dataset.vDate : undefined))
        .filter((date): date is string => Boolean(date))
        .sort(),
    )
  }

  return page.$$eval(".v-date-picker-table .v-btn--active", (nodes) =>
    nodes
      .map((node) => {
        const text = node.textContent?.trim()
        const day = Number(text)
        if (!Number.isInteger(day) || day < 1 || day > 31) return null
        return `2026-05-${String(day).padStart(2, "0")}`
      })
      .filter((date): date is string => date !== null)
      .sort(),
  )
}

function assertSelectedDates(label: AppLabel, selectedDates: string[], expectedDates: string[]) {
  if (JSON.stringify(selectedDates) !== JSON.stringify(expectedDates)) {
    throw new Error(
      `${label.name} selected dates mismatch: expected ${JSON.stringify(expectedDates)}, got ${JSON.stringify(selectedDates)}`,
    )
  }
}

async function selectStableCalendarDate(page: import("@playwright/test").Page, label: AppLabel) {
  await clickCalendarDate(page, label, SELECTED_DATE)
  await page.waitForTimeout(50)
}

async function prepareSelectedCalendar(page: import("@playwright/test").Page, label: AppLabel) {
  await openNewEventDialog(page)
  await page.waitForSelector(".v-picker, .v-date-picker")
  await selectStableCalendarDate(page, label)
}

export const newEventCalendarScenario = {
  readySelector: "button",
  elements: [
    {
      name: "calendarQuestion",
      kind: "text",
      selector: "div, span, label",
      text: "What dates might work?",
    },
    {
      name: "calendarHelper",
      kind: "text",
      selector: "div, span, label",
      text: "Drag to select multiple dates",
    },
    {
      name: "calendarPicker",
      kind: "selector",
      selector: ".v-picker, .v-date-picker",
    },
    {
      name: "calendarControls",
      kind: "selector",
      selector: ".v-date-picker-header, .v-date-picker-controls",
    },
    {
      name: "calendarMonthLabel",
      kind: "calendarMonthLabel",
    },
    {
      name: "calendarYearLabel",
      kind: "calendarYearLabel",
    },
    {
      name: "calendarSelectedDay",
      kind: "calendarSelectedDay",
    },
  ],
  prepare: async (page, label) => {
    await openNewEventDialog(page)
    await page.waitForFunction(() => {
      const helper = Array.from(document.querySelectorAll("div, span, label")).find(
        (node) => node.textContent?.trim() === "Drag to select multiple dates",
      )
      const picker = document.querySelector(".v-picker, .v-date-picker")
      return Boolean(helper && picker)
    })
    await selectStableCalendarDate(page, label)
  },
} satisfies ScenarioDefinition

export const newEventCalendarInteractionScenario = {
  readySelector: "button",
  elements: [],
  prepare: async () => {},
  runInteraction: async (oldPage, newPage) => {
    const oldApp = { name: "old", url: oldPage.url() } satisfies AppLabel
    const newApp = { name: "new", url: newPage.url() } satisfies AppLabel

    await Promise.all([
      prepareSelectedCalendar(oldPage, oldApp),
      prepareSelectedCalendar(newPage, newApp),
    ])

    const selectedAfterClick = await Promise.all([
      collectSelectedDates(oldPage, oldApp),
      collectSelectedDates(newPage, newApp),
    ])

    assertSelectedDates(oldApp, selectedAfterClick[0], [SELECTED_DATE])
    assertSelectedDates(newApp, selectedAfterClick[1], [SELECTED_DATE])

    await Promise.all([
      hoverCalendarDate(oldPage, oldApp, HOVER_DATE),
      hoverCalendarDate(newPage, newApp, HOVER_DATE),
    ])

    const selectedAfterHover = await Promise.all([
      collectSelectedDates(oldPage, oldApp),
      collectSelectedDates(newPage, newApp),
    ])

    assertSelectedDates(oldApp, selectedAfterHover[0], [SELECTED_DATE])
    assertSelectedDates(newApp, selectedAfterHover[1], [SELECTED_DATE])

    console.log(
      `interaction selected=${JSON.stringify([SELECTED_DATE])} hover=${JSON.stringify(HOVER_DATE)}`,
    )
  },
} satisfies ScenarioDefinition
