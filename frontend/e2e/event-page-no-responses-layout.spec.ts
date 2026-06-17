import { expect, test } from "@playwright/test"
import {
  buildSpecificDateSeed,
  openEventPage,
  seedCanonicalTimedEvent,
} from "./helpers/timed-event-helpers"
import { Temporal } from "temporal-polyfill"

test.describe.configure({ mode: "serial" })

test("event page without responses shows Add availability and Show all hours directly, not wide Add availability and More options", async ({
  page,
  request,
}) => {
  const now = Temporal.Now.instant()
  const today = now.toZonedDateTimeISO("UTC").toPlainDate().toString()

  const seed = await seedCanonicalTimedEvent(
    request,
    buildSpecificDateSeed({
      name: `Layout test ${String(now.epochMilliseconds)}`,
      selectedDays: [today],
      enabledSlots: [`${today}T09:00:00.000Z`, `${today}T10:00:00.000Z`],
      activeSlots: [`${today}T09:00:00.000Z`, `${today}T10:00:00.000Z`],
      eventTimezone: "UTC",
      startTimeLocal: "09:00",
      endTimeLocal: "17:00",
      timeIncrementMinutes: 60,
    })
  )

  await openEventPage(page, seed.shortId)

  // Verify "Add availability" button exists
  const addAvailabilityBtn = page.locator("#desktop-primary-availability-btn")
  await expect(addAvailabilityBtn).toBeVisible()
  await expect(addAvailabilityBtn).toHaveText(/Add availability/i)

  // Verify the parent wrapper does NOT have tw-col-span-2 (which makes it very wide)
  const parentWrapper = page.locator("#event-header-actions .desktop-primary-availability-anchor")
  const parentClass = await parentWrapper.getAttribute("class")
  expect(parentClass).not.toContain("tw-col-span-2")

  // Verify "Show all hours" is directly visible
  const showAllHoursToggle = page.locator("#show-all-hours-toggle")
  await expect(showAllHoursToggle).toBeVisible()

  // Verify "More options" is NOT present
  const moreOptions = page.locator("#desktop-header-more-options")
  await expect(moreOptions).not.toBeVisible()
})
