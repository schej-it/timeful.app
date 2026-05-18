import type { Page } from "@playwright/test"

export async function clickExactText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click({ force: true })
}

export async function clickContainsText(page: Page, selector: string, text: string) {
  await page.locator(selector).filter({ hasText: text }).first().click({ force: true })
}

export async function openNewEventDialog(page: Page) {
  await clickExactText(page, "button", "Create event")
  await page.waitForSelector('input[placeholder="Name your event..."]')
}

export async function dismissConsentIfPresent(page: Page, timeoutMs = 3_000) {
  const agreeButton = page.getByRole("button", { name: /^agree$/i })

  try {
    await agreeButton.waitFor({ state: "visible", timeout: timeoutMs })
    await agreeButton.click({ force: true })
    await page.waitForTimeout(500)
  } catch {
    // Ignore pages that never render the consent dialog.
  }

  await page.evaluate(() => {
    document.getElementById("qc-cmp2-container")?.remove()
  })
}
