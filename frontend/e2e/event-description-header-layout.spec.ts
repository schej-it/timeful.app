import { expect, test } from "@playwright/test"
import {
  buildSpecificDateSeed,
  openEventPage,
  seedCanonicalTimedEvent,
} from "./helpers/timed-event-helpers"
import { Temporal } from "temporal-polyfill"

test.describe.configure({ mode: "serial" })

test("event description stays aligned to the left header column on desktop", async ({
  page,
  request,
}) => {
  const now = Temporal.Now.instant()
  const today = now.toZonedDateTimeISO("UTC").toPlainDate().toString()

  const seed = await seedCanonicalTimedEvent(
    request,
    {
      ...buildSpecificDateSeed({
        name: `Description layout ${String(now.epochMilliseconds)}`,
        selectedDays: [today],
        enabledSlots: [`${today}T09:00:00.000Z`, `${today}T10:00:00.000Z`],
        activeSlots: [`${today}T09:00:00.000Z`, `${today}T10:00:00.000Z`],
        eventTimezone: "UTC",
        startTimeLocal: "09:00",
        endTimeLocal: "17:00",
        timeIncrementMinutes: 60,
      }),
      description: "",
    }
  )

  await openEventPage(page, seed.shortId)

  const addDescriptionButton = page.getByRole("button", {
    name: /^\+\s*add description$/i,
  })
  await expect(addDescriptionButton).toBeVisible()
  await expect(page.locator("#event-header-actions")).toBeVisible()

  interface AddButtonMetrics {
    buttonRowLeft: number
    addButtonLeft: number
    addButtonTextTop: number
    addButtonFontSize: string
    addButtonLineHeight: string
  }

  interface DescriptionLayoutMetrics {
    titleToMetaGap: number
    metaToDescriptionGap: number
    descriptionRight: number
    editorRight: number
    editorTop: number
    editorFontSize: string
    editorLineHeight: string
    actionsLeft: number
  }

  const addButtonMetrics = await page.evaluate<AddButtonMetrics | null>(() => {
    const buttonRow = document.querySelector<HTMLElement>("#event-header-button-row")
    const addButton = Array.from(document.querySelectorAll<HTMLElement>("button")).find(
      (button) => button.textContent.replace(/\s+/g, " ").trim() === "+ Add description"
    )

    if (!buttonRow || !addButton) {
      return null
    }

    const buttonRowRect = buttonRow.getBoundingClientRect()
    const addButtonRect = addButton.getBoundingClientRect()
    const addButtonStyle = window.getComputedStyle(addButton)

    return {
      buttonRowLeft: buttonRowRect.left,
      addButtonLeft: addButtonRect.left,
      addButtonTextTop:
        addButtonRect.top + Number.parseFloat(addButtonStyle.paddingTop || "0"),
      addButtonFontSize: addButtonStyle.fontSize,
      addButtonLineHeight: addButtonStyle.lineHeight,
    }
  })

  expect(addButtonMetrics).not.toBeNull()
  if (!addButtonMetrics) {
    throw new Error("Expected add description button metrics")
  }
  expect(
    Math.abs(addButtonMetrics.buttonRowLeft - addButtonMetrics.addButtonLeft)
  ).toBeLessThanOrEqual(4)

  await addDescriptionButton.click()
  await expect(page.locator('[role="textbox"]')).toBeVisible()

  const layoutMetrics = await page.evaluate<DescriptionLayoutMetrics | null>(() => {
    const titleBlock = document.querySelector<HTMLElement>("#event-header > .tw-min-w-0.tw-flex-1 > div:first-child")
    const metaRow = document.querySelector<HTMLElement>("#event-header-meta-row")
    const descriptionShell = document.querySelector<HTMLElement>(".event-description-edit-shell")
    const descriptionEditor = document.querySelector<HTMLElement>('[role="textbox"]')
    const headerActions = document.querySelector<HTMLElement>("#event-header-actions")

    if (!titleBlock || !metaRow || !descriptionShell || !descriptionEditor || !headerActions) {
      return null
    }

    const titleRect = titleBlock.getBoundingClientRect()
    const metaRect = metaRow.getBoundingClientRect()
    const descriptionRect = descriptionShell.getBoundingClientRect()
    const editorRect = descriptionEditor.getBoundingClientRect()
    const actionsRect = headerActions.getBoundingClientRect()
    const editorStyle = window.getComputedStyle(descriptionEditor)

    return {
      titleToMetaGap: metaRect.top - titleRect.bottom,
      metaToDescriptionGap: descriptionRect.top - metaRect.bottom,
      descriptionRight: descriptionRect.right,
      editorRight: editorRect.right,
      editorTop: editorRect.top,
      editorFontSize: editorStyle.fontSize,
      editorLineHeight: editorStyle.lineHeight,
      actionsLeft: actionsRect.left,
    }
  })

  expect(layoutMetrics).not.toBeNull()
  if (!layoutMetrics) {
    throw new Error("Expected description layout metrics")
  }
  expect(
    Math.abs(layoutMetrics.titleToMetaGap - layoutMetrics.metaToDescriptionGap)
  ).toBeLessThanOrEqual(4)
  expect(addButtonMetrics.addButtonFontSize).toBe(layoutMetrics.editorFontSize)
  expect(addButtonMetrics.addButtonLineHeight).toBe(layoutMetrics.editorLineHeight)
  expect(Math.abs(addButtonMetrics.addButtonTextTop - layoutMetrics.editorTop)).toBeLessThanOrEqual(1)
  expect(layoutMetrics.descriptionRight).toBeLessThanOrEqual(layoutMetrics.actionsLeft + 1)
  expect(layoutMetrics.editorRight).toBeLessThanOrEqual(layoutMetrics.actionsLeft + 1)
})
