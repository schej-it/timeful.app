import type { Page } from "@playwright/test"
import { dismissConsentIfPresent } from "./helpers.js"

import type { AppLabel, ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"
const TIMEZONE_SELECTOR = "#timezone-select-container"
const TIME_TYPE_SELECTOR = ".tw-w-16"
const EXPECTED_TIMEZONE_TEXT = "(GMT+3:00) Istanbul, Minsk, Moscow"
const EXPECTED_TIME_TYPE_TEXT = "12h"

async function openEvent(page: Page, app: AppLabel) {
  await page.goto(new URL(EVENT_PATH, app.url).toString(), { waitUntil: "domcontentloaded" })
  await dismissConsentIfPresent(page)
  await page.locator(TIMEZONE_SELECTOR).waitFor({ state: "visible", timeout: 15000 })
}

async function openTimezoneMenu(page: Page) {
  await page.locator(TIMEZONE_SELECTOR).click({ force: true })
  await page.getByText(EXPECTED_TIMEZONE_TEXT, { exact: false }).first().waitFor({
    state: "visible",
    timeout: 5000,
  })
}

async function openTimeTypeMenu(page: Page) {
  await page.locator(TIME_TYPE_SELECTOR).click({ force: true })
  await page.getByText(EXPECTED_TIME_TYPE_TEXT, { exact: true }).first().waitFor({
    state: "visible",
    timeout: 5000,
  })
}

async function assertTimezoneMenu(page: Page, app: AppLabel) {
  const objectRows = await page.getByText("[object Object]", { exact: true }).count()
  if (objectRows > 0) {
    throw new Error(`${app.name} timezone menu rendered ${objectRows} object labels`)
  }

  const selectedText = await page.locator(TIMEZONE_SELECTOR).innerText()
  if (!selectedText.includes(EXPECTED_TIMEZONE_TEXT)) {
    throw new Error(
      `${app.name} selected timezone mismatch: expected ${JSON.stringify(EXPECTED_TIMEZONE_TEXT)}, got ${JSON.stringify(selectedText)}`,
    )
  }
}

async function assertTimeTypeMenu(page: Page, app: AppLabel) {
  const objectRows = await page.getByText("[object Object]", { exact: true }).count()
  if (objectRows > 0) {
    throw new Error(`${app.name} time-type menu rendered ${objectRows} object labels`)
  }

  const selectedText = await page.locator(TIME_TYPE_SELECTOR).innerText()
  if (!selectedText.includes(EXPECTED_TIME_TYPE_TEXT)) {
    throw new Error(
      `${app.name} selected time type mismatch: expected ${JSON.stringify(EXPECTED_TIME_TYPE_TEXT)}, got ${JSON.stringify(selectedText)}`,
    )
  }
}

export const eventTimezoneMenuScenario = {
  readySelector: "body",
  elements: [],
  prepare: async () => {},
  runInteraction: async (oldPage, newPage) => {
    const oldApp = { name: "old", url: oldPage.url() } satisfies AppLabel
    const newApp = { name: "new", url: newPage.url() } satisfies AppLabel

    await Promise.all([openEvent(oldPage, oldApp), openEvent(newPage, newApp)])
    await Promise.all([openTimezoneMenu(oldPage), openTimezoneMenu(newPage)])
    await Promise.all([assertTimezoneMenu(oldPage, oldApp), assertTimezoneMenu(newPage, newApp)])
    await Promise.all([openTimeTypeMenu(oldPage), openTimeTypeMenu(newPage)])
    await Promise.all([assertTimeTypeMenu(oldPage, oldApp), assertTimeTypeMenu(newPage, newApp)])

    console.log(
      `event-timezone-menu visibleText=${JSON.stringify(EXPECTED_TIMEZONE_TEXT)} timeType=${JSON.stringify(EXPECTED_TIME_TYPE_TEXT)}`,
    )
  },
} satisfies ScenarioDefinition
