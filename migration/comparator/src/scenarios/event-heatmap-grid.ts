import type { ScenarioDefinition } from "../types.js"
import { dismissConsentIfPresent } from "./helpers.js"

const EVENT_PATH = "/e/dEeaF"

export const eventHeatmapGridScenario = {
  readySelector: "#drag-section .timeslot",
  readyTimeoutMs: 30_000,
  elements: [
    { name: "timeslot1", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(1)" },
    { name: "timeslot2", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(2)" },
    { name: "timeslot3", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(3)" },
    { name: "timeslot4", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(4)" },
    { name: "timeslot5", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(5)" },
    { name: "timeslot6", kind: "selector", selector: "#drag-section .timeslot:nth-of-type(6)" },
  ],
  prepare: async (page, label) => {
    await page.addInitScript(() => {
      localStorage.showBestTimes = "false"
    })
    await page.goto(new URL(EVENT_PATH, label.url).toString(), { waitUntil: "domcontentloaded" })
    await dismissConsentIfPresent(page)
    await page.waitForTimeout(1_500)
  },
} satisfies ScenarioDefinition
