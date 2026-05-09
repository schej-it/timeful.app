import type { ScenarioDefinition } from "../types.js"

export const landingScenario = {
  readySelector: "h1",
  elements: [
    { name: "headerRow", kind: "selector", selector: ".tw-flex.tw-items-center.tw-pt-5" },
    {
      name: "headerBrand",
      kind: "selector",
      selector: ".tw-flex.tw-items-center.tw-pt-5 > :first-child",
    },
    {
      name: "headerActions",
      kind: "selector",
      selector: ".tw-flex.tw-items-center.tw-pt-5 > :last-child",
    },
    { name: "heroCopy", kind: "heroCopy" },
    { name: "heroBadge", kind: "selector", selector: ".landing-github-badge" },
    { name: "heroHeadingWrap", kind: "selector", selector: ".landing-hero-heading" },
    { name: "heroHeading", kind: "text", selector: "h1", text: "Find a time to meet" },
    {
      name: "heroSubtitle",
      kind: "containsText",
      selector: "div, p, span",
      text: "Coordinate group meetings without the back and forth.",
    },
    { name: "calendarLink", kind: "text", selector: "span, a", text: "calendar" },
    {
      name: "legacyNote",
      kind: "containsText",
      selector: "a",
      text: 'Formerly known as "Schej"',
    },
    { name: "legacyNoteRow", kind: "legacyNoteRow" },
    { name: "legacyNoteIcon", kind: "legacyNoteIcon" },
  ],
  prepare: async () => {},
} satisfies ScenarioDefinition
