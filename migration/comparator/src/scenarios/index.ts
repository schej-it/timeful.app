import { landingScenario } from "./landing.js"
import { eventLegacyNoteScenario } from "./event-legacy-note.js"
import { eventOptionsInteractionScenario } from "./event-options.js"
import { eventTimezoneMenuScenario } from "./event-timezone-menu.js"
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
  "event-timezone-menu": eventTimezoneMenuScenario,
  "schedule-event-upward-drag": scheduleEventUpwardDragScenario,
} as const

export type CompareTarget = keyof typeof SCENARIOS

export const SUPPORTED_TARGETS = Object.keys(SCENARIOS) as CompareTarget[]
