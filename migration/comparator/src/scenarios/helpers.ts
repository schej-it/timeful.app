import type { Page } from "@playwright/test"

export async function clickExactText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click()
}

export async function clickContainsText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click()
}

export async function openNewEventDialog(page: Page) {
  await clickExactText(page, "button", "Create event")
  await page.waitForSelector('input[placeholder="Name your event..."]')
}
