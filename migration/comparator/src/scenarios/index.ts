import { landingScenario } from "./landing.js"
import {
  newEventCalendarInteractionScenario,
  newEventCalendarScenario,
} from "./new-event-calendar.js"
import { newEventFormScenario } from "./new-event-form.js"

import type { ScenarioDefinition } from "../types.js"

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  landing: landingScenario,
  "new-event-form": newEventFormScenario,
  "new-event-calendar": newEventCalendarScenario,
  "new-event-calendar-interaction": newEventCalendarInteractionScenario,
} as const

export type CompareTarget = keyof typeof SCENARIOS

export const SUPPORTED_TARGETS = Object.keys(SCENARIOS) as CompareTarget[]
