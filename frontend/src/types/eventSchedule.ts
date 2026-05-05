import type { Event } from "./index"

export type EventScheduleFields = Pick<
  Event,
  "type" | "dates" | "daysOnly" | "startOnMonday" | "duration"
>

export type EventWeekProjectionFields = Pick<
  Event,
  "type" | "dates" | "startOnMonday"
>
