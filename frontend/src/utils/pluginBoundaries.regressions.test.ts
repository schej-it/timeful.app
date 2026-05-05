import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { stubRegressionLocalStorage } from "@/test/regressionTestSetup"
import { zdt } from "@/test/regressionHarness"
import { fromRawEvent } from "@/types/transport"
import {
  normalizePluginSetSlots,
  resolvePluginTimezoneValue,
  resolveTimezoneValue,
  validateDOWPayload,
} from "@/utils"
import { eventTypes } from "@/constants"
import {
  getPluginEventTimeRange,
  normalizePluginResponses,
} from "@/views/event/pluginResponsesBoundary"

describe("plugin boundary regressions", () => {
  beforeEach(() => {
    stubRegressionLocalStorage()
  })

  it("normalizes specific-dates plugin slots from bare local timestamps using the payload timezone", () => {
    const result = normalizePluginSetSlots(
      [
        {
          start: "2026-01-07T09:00:00",
          end: "2026-01-07T12:00:00",
          status: "available",
        },
      ],
      "America/Los_Angeles",
      eventTypes.SPECIFIC_DATES
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(result.slots[0].parsedStart.toString()).toContain("[America/Los_Angeles]")
    expect(result.slots[0].parsedStart.hour).toBe(9)
    expect(result.slots[0].parsedEnd.hour).toBe(12)
  })

  it("normalizes DOW plugin slots without reparsing bare local timestamps through ZonedDateTime.from", () => {
    const slots = [
      {
        start: "2018-06-18T09:00:00",
        end: "2018-06-18T12:00:00",
        status: "available" as const,
      },
    ]

    expect(() => validateDOWPayload(slots)).not.toThrow()
    expect(validateDOWPayload(slots)).toBeNull()

    const result = normalizePluginSetSlots(slots, "America/Los_Angeles", eventTypes.DOW)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(result.slots[0].parsedStart.hour).toBe(10)
    expect(result.slots[0].parsedEnd.hour).toBe(13)
  })

  it("preserves the legacy DOW one-hour shift semantics across midnight rollovers", () => {
    const slots = [
      {
        start: "2018-06-18T23:00:00",
        end: "2018-06-18T23:30:00",
        status: "available" as const,
      },
    ]

    const result = normalizePluginSetSlots(slots, "America/Los_Angeles", eventTypes.DOW)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error)
    }

    const legacyShiftedStart = Temporal.PlainDateTime.from(slots[0].start)
      .add({ hours: 1 })
      .toString()
    const legacyShiftedEnd = Temporal.PlainDateTime.from(slots[0].end)
      .add({ hours: 1 })
      .toString()

    const expectedStart = Temporal.ZonedDateTime.from(
      `${legacyShiftedStart}[America/Los_Angeles]`
    )
    const expectedEnd = Temporal.ZonedDateTime.from(
      `${legacyShiftedEnd}[America/Los_Angeles]`
    )

    expect(result.slots[0].parsedStart.epochMilliseconds).toBe(
      expectedStart.epochMilliseconds
    )
    expect(result.slots[0].parsedEnd.epochMilliseconds).toBe(
      expectedEnd.epochMilliseconds
    )
    expect(result.slots[0].parsedStart.toPlainDate().toString()).toBe("2018-06-19")
  })

  it("round-trips DOW plugin slots for non-DST timezones", () => {
    const inputSlots = [
      {
        start: "2018-06-18T09:00:00",
        end: "2018-06-18T10:00:00",
        status: "available" as const,
      },
    ]

    const normalizedSetSlots = normalizePluginSetSlots(
      inputSlots,
      "Asia/Tokyo",
      eventTypes.DOW
    )

    expect(normalizedSetSlots.ok).toBe(true)
    if (!normalizedSetSlots.ok) {
      throw new Error(normalizedSetSlots.error)
    }

    const roundTrippedSlots = normalizePluginResponses({
      rawResponses: {
        "user-1": {
          availability: [normalizedSetSlots.slots[0].parsedStart.epochMilliseconds],
          ifNeeded: [],
        },
      },
      eventResponses: {
        "user-1": {
          name: "Ada",
          email: "ada@example.com",
        },
      },
      timezoneValue: "Asia/Tokyo",
      eventType: eventTypes.DOW,
    })

    expect(roundTrippedSlots["user-1"].availability[0].timeZoneId).toBe("Asia/Tokyo")
    expect(roundTrippedSlots["user-1"].availability[0].hour).toBe(9)
  })

  it("reports malformed plugin local timestamps as structured parse errors", () => {
    const result = normalizePluginSetSlots(
      [
        {
          start: "not-a-time",
          end: "2026-01-07T12:00:00",
          status: "available",
        },
      ],
      "America/Los_Angeles",
      eventTypes.SPECIFIC_DATES
    )

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected plugin slot normalization to fail")
    }

    expect(result.error).toContain("Failed to parse time at index 0")
  })

  it("prefers the payload timezone over a conflicting saved timezone for plugin slot parsing", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "Europe/Berlin",
      })
    )

    const timezoneValue = resolvePluginTimezoneValue(
      "America/Los_Angeles",
      localStorage,
      "UTC"
    )
    const result = normalizePluginSetSlots(
      [
        {
          start: "2026-01-07T09:00:00",
          end: "2026-01-07T10:00:00",
          status: "available",
        },
      ],
      timezoneValue,
      eventTypes.SPECIFIC_DATES
    )

    expect(timezoneValue).toBe("America/Los_Angeles")
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error)
    }

    expect(result.slots[0].parsedStart.hour).toBe(9)
    expect(result.slots[0].parsedStart.timeZoneId).toBe("America/Los_Angeles")
  })

  it("preserves offset-only saved timezones in plugin helpers", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: "PT5H45M",
      })
    )

    const timezoneValue = resolvePluginTimezoneValue(
      undefined,
      localStorage,
      "America/New_York"
    )
    const slots = normalizePluginResponses({
      rawResponses: {
        "user-1": {
          availability: [Date.parse("2026-01-07T03:15:00Z")],
          ifNeeded: [Date.parse("2026-01-07T04:15:00Z")],
        },
      },
      eventResponses: {
        "user-1": {
          name: "Ada",
          email: "ada@example.com",
        },
      },
      timezoneValue,
      eventType: eventTypes.SPECIFIC_DATES,
    })

    expect(timezoneValue).toBe("+05:45")
    expect(slots["user-1"].availability[0].timeZoneId).toBe("+05:45")
    expect(slots["user-1"].availability[0].hour).toBe(9)
    expect(slots["user-1"].ifNeeded[0].hour).toBe(10)
  })

  it("preserves offset-only saved timezones in the shared create-flow resolver", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: "PT5H45M",
      })
    )

    const timezoneValue = resolveTimezoneValue(undefined, localStorage, "America/New_York")

    expect(timezoneValue).toBe("+05:45")
  })

  it("normalizes plugin get-slots responses through the shared raw-response adapter", () => {
    const slots = normalizePluginResponses({
      rawResponses: {
        "user-1": {
          availability: [Date.parse("2026-01-07T17:00:00Z")],
          ifNeeded: [Date.parse("2026-01-07T18:00:00Z")],
        },
      },
      eventResponses: {
        "user-1": {
          user: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
        },
      },
      timezoneValue: "America/Los_Angeles",
      eventType: eventTypes.SPECIFIC_DATES,
    })

    expect(slots["user-1"].name).toBe("Ada Lovelace")
    expect(slots["user-1"].email).toBe("ada@example.com")
    expect(slots["user-1"].availability[0].timeZoneId).toBe("America/Los_Angeles")
    expect(slots["user-1"].availability[0].hour).toBe(9)
    expect(slots["user-1"].ifNeeded[0].hour).toBe(10)
  })

  it("keeps plugin get-slots output on the saved fixed offset when no payload timezone is provided", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: "PT5H45M",
      })
    )

    const timezoneValue = resolvePluginTimezoneValue(
      undefined,
      localStorage,
      "America/New_York"
    )
    const slots = normalizePluginResponses({
      rawResponses: {
        "user-1": {
          availability: [Date.parse("2026-01-07T03:15:00Z")],
          ifNeeded: [Date.parse("2026-01-07T04:15:00Z")],
        },
      },
      eventResponses: {
        "user-1": {
          user: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
        },
      },
      timezoneValue,
      eventType: eventTypes.SPECIFIC_DATES,
    })

    expect(timezoneValue).toBe("+05:45")
    expect(slots["user-1"].name).toBe("Ada Lovelace")
    expect(slots["user-1"].email).toBe("ada@example.com")
    expect(slots["user-1"].availability[0].timeZoneId).toBe("+05:45")
    expect(slots["user-1"].availability[0].hour).toBe(9)
    expect(slots["user-1"].ifNeeded[0].timeZoneId).toBe("+05:45")
    expect(slots["user-1"].ifNeeded[0].hour).toBe(10)
  })

  it("derives plugin get-slots time ranges from normalized event dates", () => {
    const rawEvent: Parameters<typeof fromRawEvent>[0] = {
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Date.parse("2026-01-07T17:00:00Z"),
        Date.parse("2026-01-08T17:00:00Z"),
      ],
    }
    const event = fromRawEvent(rawEvent)
    if (!event.dates?.[1]) throw new Error("Expected normalized event dates")

    const range = getPluginEventTimeRange(event, 0)
    if (!range) throw new Error("Expected plugin event time range")

    expect(range.timeMin.equals(event.timeSeed ?? range.timeMin)).toBe(true)
    expect(range.timeMax.toInstant().toString()).toBe("2026-01-09T17:00:00Z")
  })

  it("derives plugin get-slots time ranges from an explicit displayed week for DOW events", () => {
    const rawEvent: Parameters<typeof fromRawEvent>[0] = {
      _id: "evt-1",
      type: eventTypes.DOW,
      dates: [
        Date.parse("2026-01-05T17:00:00Z"),
        Date.parse("2026-01-07T17:00:00Z"),
      ],
    }
    const event = fromRawEvent(rawEvent)

    const range = getPluginEventTimeRange(event, 1, zdt("2026-01-18T00:00:00Z"))
    if (!range) throw new Error("Expected plugin event time range")

    expect(range.timeMin.toInstant().toString()).toBe("2026-01-19T17:00:00Z")
    expect(range.timeMax.toInstant().toString()).toBe("2026-01-22T17:00:00Z")
  })
})
