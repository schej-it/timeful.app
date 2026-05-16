import { clickContainsText } from "./helpers.js"

import type { AppLabel } from "../types.js"
import type { ScenarioDefinition } from "../types.js"

const EVENT_PATH = "/e/dEeaF"
const DRAG_START_INDEX = 8
const DRAG_END_INDEX = 5
const POSITION_TOLERANCE_PX = 8

type Box = {
  x: number
  y: number
  width: number
  height: number
}

async function openEventPage(page: import("@playwright/test").Page, label: AppLabel) {
  const url = new URL(EVENT_PATH, label.url).toString()
  await page.goto(url, { waitUntil: "domcontentloaded" })
  await page.waitForSelector("#drag-section .timeslot")
  await page.waitForSelector("button")
}

async function enterScheduleEventMode(page: import("@playwright/test").Page) {
  await clickContainsText(page, "button", "Schedule event")
  await page.waitForTimeout(100)
}

async function getBox(
  locator: import("@playwright/test").Locator,
  description: string
): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error(`Missing bounding box for ${description}`)
  }
  return box
}

async function maybeGetBox(locator: import("@playwright/test").Locator): Promise<Box | null> {
  if ((await locator.count()) === 0) {
    return null
  }
  return locator.boundingBox()
}

async function dragScheduleUpward(page: import("@playwright/test").Page) {
  const timeslots = page.locator("#drag-section .timeslot")
  const timeslotCount = await timeslots.count()
  const startBox = await getBox(
    timeslots.nth(DRAG_START_INDEX),
    `timeslot ${String(DRAG_START_INDEX)}`
  )
  const endBox = await getBox(
    timeslots.nth(DRAG_END_INDEX),
    `timeslot ${String(DRAG_END_INDEX)}`
  )

  await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, {
    steps: 12,
  })
  await page.mouse.up()
  await page.waitForTimeout(500)

  const scheduledBlock = await maybeGetBox(page.locator("#drag-section .tw-bg-blue").last())

  return {
    timeslotCount,
    startBox,
    endBox,
    scheduledBlock,
  }
}

function assertExpandedUpward(label: AppLabel, boxes: {
  startBox: Box
  endBox: Box
  scheduledBlock: Box | null
}) {
  if (!boxes.scheduledBlock) {
    throw new Error(`${label.name} did not render a scheduled block after the upward drag`)
  }

  const expectedTop = Math.min(boxes.startBox.y, boxes.endBox.y)
  const minimumHeight = boxes.startBox.height * 3.5

  if (boxes.scheduledBlock.height < minimumHeight) {
    throw new Error(
      `${label.name} scheduled block did not expand upward: height=${String(
        boxes.scheduledBlock.height
      )}, minimum=${String(minimumHeight)}`
    )
  }

  if (Math.abs(boxes.scheduledBlock.y - expectedTop) > POSITION_TOLERANCE_PX) {
    throw new Error(
      `${label.name} scheduled block top mismatch: expected about ${String(
        expectedTop
      )}, got ${String(boxes.scheduledBlock.y)}`
    )
  }
}

function assertSurfaceParity(
  oldBoxes: { timeslotCount: number; startBox: Box; endBox: Box },
  newBoxes: { timeslotCount: number; startBox: Box; endBox: Box }
) {
  if (oldBoxes.timeslotCount !== newBoxes.timeslotCount) {
    throw new Error(
      `timeslot count diverged before drag: old=${String(oldBoxes.timeslotCount)}, new=${String(
        newBoxes.timeslotCount
      )}`
    )
  }

  if (Math.abs(oldBoxes.startBox.height - newBoxes.startBox.height) > POSITION_TOLERANCE_PX) {
    throw new Error(
      `start timeslot height diverged: old=${String(oldBoxes.startBox.height)}, new=${String(
        newBoxes.startBox.height
      )}`
    )
  }

  if (Math.abs(oldBoxes.endBox.height - newBoxes.endBox.height) > POSITION_TOLERANCE_PX) {
    throw new Error(
      `end timeslot height diverged: old=${String(oldBoxes.endBox.height)}, new=${String(
        newBoxes.endBox.height
      )}`
    )
  }
}

function assertParity(oldBoxes: { scheduledBlock: Box | null }, newBoxes: { scheduledBlock: Box | null }) {
  if (!oldBoxes.scheduledBlock || !newBoxes.scheduledBlock) {
    return
  }

  if (
    Math.abs(oldBoxes.scheduledBlock.height - newBoxes.scheduledBlock.height) >
    POSITION_TOLERANCE_PX
  ) {
    throw new Error(
      `scheduled block height diverged: old=${String(
        oldBoxes.scheduledBlock.height
      )}, new=${String(newBoxes.scheduledBlock.height)}`
    )
  }

  if (Math.abs(oldBoxes.scheduledBlock.y - newBoxes.scheduledBlock.y) > POSITION_TOLERANCE_PX) {
    throw new Error(
      `scheduled block top diverged: old=${String(oldBoxes.scheduledBlock.y)}, new=${String(
        newBoxes.scheduledBlock.y
      )}`
    )
  }
}

export const scheduleEventUpwardDragScenario = {
  readySelector: "button",
  elements: [],
  prepare: async () => {},
  runInteraction: async (oldPage, newPage) => {
    const oldApp = { name: "old", url: oldPage.url() } satisfies AppLabel
    const newApp = { name: "new", url: newPage.url() } satisfies AppLabel

    await Promise.all([openEventPage(oldPage, oldApp), openEventPage(newPage, newApp)])
    await Promise.all([enterScheduleEventMode(oldPage), enterScheduleEventMode(newPage)])

    const oldBoxes = await dragScheduleUpward(oldPage)
    const newBoxes = await dragScheduleUpward(newPage)

    assertSurfaceParity(oldBoxes, newBoxes)
    assertExpandedUpward(newApp, newBoxes)
    assertParity(oldBoxes, newBoxes)

    console.log(
      `schedule-event-upward-drag oldBlock=${JSON.stringify(
        oldBoxes.scheduledBlock
      )} newBlock=${JSON.stringify(newBoxes.scheduledBlock)}`
    )
  },
} satisfies ScenarioDefinition
