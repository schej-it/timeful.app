import { landingScenario } from "./landing.js"
import { eventLegacyNoteScenario } from "./event-legacy-note.js"
import { eventOptionsInteractionScenario } from "./event-options.js"
import { eventOptionsStyleScenario } from "./event-options-style.js"
import { eventOptionsStyleOnScenario } from "./event-options-style-on.js"
import { eventDescriptionStyleScenario } from "./event-description-style.js"
import { eventDescriptionRealScenario } from "./event-description-real.js"
import { eventTimezoneMenuScenario } from "./event-timezone-menu.js"
import { eventRespondentsPanelScenario } from "./event-respondents-panel.js"
import { eventRespondentsPanelHoverScenario } from "./event-respondents-panel-hover.js"
import { eventBestTimesGridScenario } from "./event-best-times-grid.js"
import { eventHeatmapGridScenario } from "./event-heatmap-grid.js"
import { eventOverlayAvailabilityScenario } from "./event-overlay-availability.js"
import {
  newEventCalendarInteractionScenario,
  newEventCalendarScenario,
} from "./new-event-calendar.js"
import { newEventFormScenario } from "./new-event-form.js"
import { scheduleEventUpwardDragScenario } from "./schedule-event-upward-drag.js"

import type { ScenarioDefinition } from "../types.js"

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  landing: landingScenario,
  "event-legacy-note": eventLegacyNoteScenario,
  "new-event-form": newEventFormScenario,
  "new-event-calendar": newEventCalendarScenario,
  "new-event-calendar-interaction": newEventCalendarInteractionScenario,
  "event-options-interaction": eventOptionsInteractionScenario,
  "event-options-style": eventOptionsStyleScenario,
  "event-options-style-on": eventOptionsStyleOnScenario,
  "event-description-style": eventDescriptionStyleScenario,
  "event-description-real": eventDescriptionRealScenario,
  "event-respondents-panel": eventRespondentsPanelScenario,
  "event-respondents-panel-hover": eventRespondentsPanelHoverScenario,
  "event-best-times-grid": eventBestTimesGridScenario,
  "event-heatmap-grid": eventHeatmapGridScenario,
  "event-overlay-availability": eventOverlayAvailabilityScenario,
  "event-timezone-menu": eventTimezoneMenuScenario,
  "schedule-event-upward-drag": scheduleEventUpwardDragScenario,
} as const

export type CompareTarget = keyof typeof SCENARIOS

export const SUPPORTED_TARGETS = Object.keys(SCENARIOS) as CompareTarget[]
