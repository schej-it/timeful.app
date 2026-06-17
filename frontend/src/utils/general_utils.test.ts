import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, UTC } from "@/constants"
import type { Event } from "@/types"
import { processEvent } from "./general_utils"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

describe("processEvent", () => {
  it("uses canonical slot generation for non-specific timed events even when enabled slots contain stale sparse coverage", () => {
    const event: Event = {
      _id: "evt-stale-canonical-window",
      ownerId: "owner-1",
      name: "Stale canonical coverage",
      type: "specific_dates",
      dates: [
        Temporal.PlainDate.from("2026-06-11"),
        Temporal.PlainDate.from("2026-06-12"),
      ],
      timeSeed: zdt("2026-06-11T07:00:00Z"),
      duration: Temporal.Duration.from({ hours: 8 }),
      daysOnly: false,
      hasSpecificTimes: false,
      timeIncrement: durations.FIFTEEN_MINUTES,
      eventTimezone: "Africa/Harare",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("09:00:00"),
        endTimeLocal: Temporal.PlainTime.from("17:00:00"),
        timeIncrement: durations.FIFTEEN_MINUTES,
      },
      enabledSlots: [
        zdt("2026-06-11T01:45:00Z"),
        zdt("2026-06-11T02:00:00Z"),
        zdt("2026-06-11T02:15:00Z"),
        zdt("2026-06-11T07:00:00Z"),
        zdt("2026-06-11T14:45:00Z"),
        zdt("2026-06-12T07:00:00Z"),
        zdt("2026-06-12T14:45:00Z"),
      ],
      activeSlots: [
        zdt("2026-06-11T01:45:00Z"),
        zdt("2026-06-11T02:00:00Z"),
        zdt("2026-06-11T02:15:00Z"),
        zdt("2026-06-11T07:00:00Z"),
        zdt("2026-06-11T14:45:00Z"),
        zdt("2026-06-12T07:00:00Z"),
        zdt("2026-06-12T14:45:00Z"),
      ],
      times: [
        zdt("2026-06-11T01:45:00Z"),
        zdt("2026-06-11T02:00:00Z"),
        zdt("2026-06-11T02:15:00Z"),
        zdt("2026-06-11T07:00:00Z"),
        zdt("2026-06-11T14:45:00Z"),
        zdt("2026-06-12T07:00:00Z"),
        zdt("2026-06-12T14:45:00Z"),
      ],
      responses: {},
      notificationsEnabled: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      blindAvailabilityEnabled: false,
      remindees: [],
    }

    processEvent(event)

    expect(event.startTime?.toString()).toBe("07:00:00")
    expect(event.endTime?.toString()).toBe("15:00:00")
  })
})
