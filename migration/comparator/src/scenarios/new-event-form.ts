import { clickContainsText, openNewEventDialog } from "./helpers.js"

import type { ScenarioDefinition } from "../types.js"

export const newEventFormScenario = {
  readySelector: "button",
  elements: [
    { name: "newEventDialog", kind: "newEventDialog" },
    {
      name: "newEventTitle",
      kind: "text",
      selector: "div, span, h1, h2, h3",
      text: "New event",
    },
    {
      name: "newEventCloseButton",
      kind: "selector",
      selector:
        ".v-card .v-card-title .v-btn:last-child, .v-card .v-card-title button:last-child, .v-card > .tw-flex.tw-rounded > .v-btn:last-child, .v-card > .tw-flex.tw-rounded > button:last-child",
    },
    { name: "daysOnlyToggle", kind: "daysOnlyToggle" },
    { name: "daysOnlyToggleFrame", kind: "daysOnlyToggleFrame" },
    { name: "daysOnlyToggleActiveLabel", kind: "daysOnlyToggleActiveLabel" },
    {
      name: "advancedOptionsToggle",
      kind: "containsText",
      selector: "button, [role='button'], .v-btn",
      text: "Advanced options",
    },
    { name: "advancedOptionsContent", kind: "advancedOptionsContent" },
    { name: "advancedOptionsDisabledLabel", kind: "advancedOptionsDisabledLabel" },
    { name: "advancedOptionsSignInPrompt", kind: "advancedOptionsSignInPrompt" },
    { name: "advancedOptionsSignInLink", kind: "advancedOptionsSignInLink" },
    {
      name: "timeIncrementLabel",
      kind: "text",
      selector: "div, span, label",
      text: "Time increment:",
    },
    { name: "timeIncrementSelect", kind: "timeIncrementSelect" },
    { name: "timezoneRow", kind: "selector", selector: "#timezone-select-container" },
    { name: "timezoneLabel", kind: "timezoneLabel" },
    {
      name: "timezoneSelect",
      kind: "selector",
      selector:
        "#timezone-select-container .v-field, #timezone-select-container .v-input, #timezone-select-container [role='combobox']",
    },
  ],
  prepare: async (page) => {
    await openNewEventDialog(page)
    await clickContainsText(page, "button, [role='button'], .v-btn", "Advanced options")
    await page.waitForFunction(() => {
      const timezoneRow = document.querySelector("#timezone-select-container")
      if (!timezoneRow) {
        return false
      }

      const computed = window.getComputedStyle(timezoneRow)
      return computed.display !== "none"
    })
    await page.waitForFunction(() => {
      const label = Array.from(document.querySelectorAll("div, span, label")).find(
        (node) => node.textContent?.trim() === "Time increment:",
      )

      return Boolean(label)
    })
  },
} satisfies ScenarioDefinition
