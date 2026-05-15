import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { stubRegressionLocalStorage } from "@/test/regressionTestSetup"
import { epochMs, zdt } from "@/test/regressionHarness"
import {
  fromRawCalendarEvent,
  fromRawEvent,
  fromRawResponse,
  fromRawSignUpBlock,
  toRawEvent,
  fromRawUser,
  toRawCalendarOptions,
  toRawUser,
} from "@/types/transport"
import { get } from "@/utils/fetch_utils"
import { getDateWithTimezone, ZdtMap, ZdtSet } from "@/utils"
import { eventTypes } from "@/constants"
import { toEventPatchPayload } from "@/composables/event/eventMutationBoundary"
import {
  fromSerializedEventDraft,
  serializeRouteTimezone,
  toSerializedEventDraft,
} from "@/composables/event/draftBoundary"
import {
  fetchUserCalendarEventsMap,
  fetchCalendarAvailabilities,
  fetchCalendarEventsMap,
  fromCalendarAvailabilitiesTransportMap,
  fromCalendarEventsTransportMap,
} from "@/composables/event/calendarEventsBoundary"
import { fetchUserEvents } from "@/utils/services/EventService"
import { fetchUserFolders } from "@/utils/services/FolderService"
import { toScheduleOverlapEvent } from "@/composables/schedule_overlap/types"
import { toGroupResponseSubmissionPayload } from "@/composables/event/responseSubmissionBoundary"
import type { SignUpBlockWithResponses } from "@/types"

vi.mock("@/utils/fetch_utils", async () => {
  const actual = await vi.importActual("@/utils/fetch_utils")

  return {
    ...actual,
    get: vi.fn(),
  }
})

describe("transport and timezone regression boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubRegressionLocalStorage()
  })

  it("reconstructs epoch-millisecond API fields without invalid ZonedDateTime bags", () => {
    expect(() => fromRawEvent({
      dates: [0],
      times: [60 * 60 * 1000],
      duration: 1,
    })).not.toThrow()

    expect(() =>
      fromRawResponse({
        availability: [0],
        ifNeeded: [60 * 60 * 1000],
        manualAvailability: { "2026-01-01": [2 * 60 * 60 * 1000] },
      })
    ).not.toThrow()

    expect(() =>
      fromRawSignUpBlock({
        startDate: 0,
        endDate: 60 * 60 * 1000,
      })
    ).not.toThrow()

    expect(() =>
      fromRawCalendarEvent({
        startDate: 0,
        endDate: 60 * 60 * 1000,
      })
    ).not.toThrow()
  })

  it("decodes ISO instant transport fields at the boundary before event rendering", () => {
    const rawEvent = {
      dates: ["2026-05-15T06:00:00Z", "2026-05-21T06:00:00Z"],
      times: ["2026-05-15T08:00:00Z"],
      duration: 8,
      timeIncrement: 15,
      responses: {
        user_1: {
          availability: ["2026-05-15T08:00:00Z"],
          ifNeeded: ["2026-05-15T09:00:00Z"],
          manualAvailability: {
            "2026-05-15": ["2026-05-15T10:00:00Z"],
          },
        },
      },
      signUpBlocks: [
        {
          startDate: "2026-05-15T08:00:00Z",
          endDate: "2026-05-15T09:00:00Z",
        },
      ],
      scheduledEvent: {
        startDate: "2026-05-15T12:00:00Z",
        endDate: "2026-05-15T13:00:00Z",
      },
    } as unknown as Parameters<typeof fromRawEvent>[0]

    const event = fromRawEvent(rawEvent)

    expect(event.timeSeed?.toString()).toBe("2026-05-15T06:00:00+00:00[UTC]")
    expect(event.dates?.map((date) => date.toString())).toEqual([
      "2026-05-15",
      "2026-05-21",
    ])
    expect(event.timeIncrement?.toString()).toBe("PT15M")
    expect(event.times?.[0]?.toString()).toBe("2026-05-15T08:00:00+00:00[UTC]")
    expect(event.responses?.user_1.availability?.[0]?.toString()).toBe(
      "2026-05-15T08:00:00+00:00[UTC]"
    )
    expect(event.signUpBlocks?.[0]?.startDate?.toString()).toBe(
      "2026-05-15T08:00:00+00:00[UTC]"
    )
    expect(event.scheduledEvent?.startDate?.toString()).toBe(
      "2026-05-15T12:00:00+00:00[UTC]"
    )
  })

  it("exposes an explicit time seed alongside decoded event dates", () => {
    const event = fromRawEvent({
      dates: [epochMs("2026-01-02T09:30:00Z")],
      duration: 1,
    })

    expect(event.timeSeed?.toString()).toBe("2026-01-02T09:30:00+00:00[UTC]")
    expect(event.dates?.[0].toString()).toBe("2026-01-02")
  })

  it("keeps user transport decoding at an explicit boundary", () => {
    const rawUser = {
      _id: "user-1",
      email: "ada@example.com",
      calendarAccounts: {
        "ada@example.com_google": {
          email: "ada@example.com",
          enabled: true,
          subCalendars: {
            primary: {
              enabled: true,
              name: "Primary",
            },
          },
        },
      },
      calendarOptions: {
        bufferTime: { enabled: true, time: 30 },
        workingHours: { enabled: true, startTime: 8, endTime: 18 },
      },
    }

    const user = fromRawUser(rawUser)
    const roundTrip = toRawUser(user)

    expect(user).not.toBe(rawUser)
    expect(user.calendarAccounts).not.toBe(rawUser.calendarAccounts)
    expect(user.calendarOptions).not.toBe(rawUser.calendarOptions)
    expect(roundTrip).toEqual(rawUser)
  })

  it("revives a saved timezone whose Temporal.Duration was serialized through JSON", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "Europe/Vienna",
        offset: "PT60M",
        label: "Vienna",
        gmtString: "GMT+1",
      })
    )

    expect(() => getDateWithTimezone(zdt("2026-01-01T00:00:00Z"))).not.toThrow()
  })

  it("reconstructs edit-flow times with the saved timezone rules instead of a stale offset", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "America/New_York",
        offset: "-PT5H",
        label: "Eastern Time",
        gmtString: "GMT-5",
      })
    )

    const reconstructed = getDateWithTimezone(zdt("2026-06-15T12:00:00Z"))

    expect(reconstructed.timeZoneId).toBe("America/New_York")
    expect(reconstructed.toPlainTime().toString()).toBe("08:00:00")
    expect(reconstructed.toPlainDate().toString()).toBe("2026-06-15")
  })

  it("reconstructs edit-flow times for offset-only saved timezones through the shared boundary", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: "PT5H45M",
        label: "Nepal Time",
        gmtString: "GMT+5:45",
      })
    )

    const reconstructed = getDateWithTimezone(zdt("2026-06-15T12:00:00Z"))

    expect(reconstructed.timeZoneId).toBe("+05:45")
    expect(reconstructed.toPlainTime().toString()).toBe("17:45:00")
    expect(reconstructed.toPlainDate().toString()).toBe("2026-06-15")
  })

  it("keeps serialized timezone offsets string-encoded at the boundary", () => {
    const serializedDraft = toSerializedEventDraft({
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT5H45M"),
      },
    })
    const serializedTimezone = serializeRouteTimezone({
      value: "Asia/Kathmandu",
      label: "Kathmandu",
      gmtString: "GMT+5:45",
      offset: Temporal.Duration.from("PT5H45M"),
    })

    expect(serializedDraft.timezone).toEqual({
      value: "Asia/Kathmandu",
      label: "Kathmandu",
      gmtString: "GMT+5:45",
      offset: "PT5H45M",
    })
    expect(JSON.parse(serializedTimezone)).toEqual({
      value: "Asia/Kathmandu",
      label: "Kathmandu",
      gmtString: "GMT+5:45",
      offset: "PT5H45M",
    })
  })

  it("decodes encoded route drafts into canonical Temporal runtime values", () => {
    const draft = fromSerializedEventDraft({
      name: "Draft",
      startTime: 9,
      endTime: 17,
      selectedDays: ["2026-05-01"],
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: "PT5H45M",
      },
    })

    expect(draft).toEqual({
      name: "Draft",
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      selectedDays: [Temporal.PlainDate.from("2026-05-01")],
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT5H45M"),
      },
    })
  })

  it("rejects mixed encoded and Temporal route-draft input at the boundary", () => {
    const draft = fromSerializedEventDraft({
      name: "Draft",
      startTime: Temporal.PlainTime.from("09:00") as never,
      endTime: 17,
      selectedDays: [Temporal.PlainDate.from("2026-05-01")] as never,
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT5H45M") as never,
      },
    })

    expect(draft).toEqual({
      name: "Draft",
      endTime: Temporal.PlainTime.from("17:00"),
      selectedDays: [],
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT0S"),
      },
    })
  })

  it("normalizes raw event extras before schedule-overlap consumes them", () => {
    const event = fromRawEvent({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [epochMs("2026-01-01T00:00:00Z")],
      duration: 1,
      scheduledEvent: {
        calendarId: "primary",
        startDate: epochMs("2026-01-01T11:00:00Z"),
        endDate: epochMs("2026-01-01T12:00:00Z"),
      },
      responses: {
        "user-1": {
          calendarOptions: {
            bufferTime: { enabled: true, time: 15 },
            workingHours: { enabled: true, startTime: 9, endTime: 17 },
          },
        },
      },
      signUpBlocks: [
        {
          _id: "block-1",
          capacity: 2,
          name: "Slot 1",
          startDate: epochMs("2026-01-01T09:00:00Z"),
          endDate: epochMs("2026-01-01T10:00:00Z"),
        },
      ],
      signUpResponses: {
        "user-1": {
          userId: "user-1",
          signUpBlockIds: ["block-1"],
          user: {
            _id: "user-1",
            email: "ada@example.com",
            calendarOptions: {
              bufferTime: { enabled: true, time: 30 },
              workingHours: { enabled: true, startTime: 8, endTime: 18 },
            },
          },
        },
      },
    })

    const normalized = toScheduleOverlapEvent(event)

    expect(event.scheduledEvent?.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.scheduledEvent?.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpResponses?.["user-1"]?.user).toBeDefined()
    expect(
      event.signUpResponses?.["user-1"]?.user?.calendarOptions?.bufferTime?.time
    ).toBe(30)
    expect(
      normalized.signUpResponses?.["user-1"]?.user?.calendarOptions?.workingHours?.endTime
    ).toBe(18)
    expect(normalized.responses?.["user-1"]?.calendarOptions?.bufferTime?.time).toBe(15)
    expect(normalized.signUpBlocks?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalized.signUpBlocks?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
  })

  it("normalizes fetched calendar-event transport payloads before storing internal state", () => {
    const calendarEventsMap = fromCalendarEventsTransportMap({
      "google:user@example.com": {
        error: true,
        calendarEvents: [
          {
            calendarId: "primary",
            startDate: epochMs("2026-01-01T09:00:00Z"),
            endDate: epochMs("2026-01-01T10:00:00Z"),
          },
        ],
      },
    })
    const calendarAvailabilities = fromCalendarAvailabilitiesTransportMap({
      "user-1": [
        {
          calendarId: "primary",
          startDate: epochMs("2026-01-02T09:00:00Z"),
          endDate: epochMs("2026-01-02T10:00:00Z"),
        },
      ],
    })
    const calendarEntry = calendarEventsMap["google:user@example.com"]
    const normalizedCalendarEvent = calendarEntry.calendarEvents?.[0]
    const normalizedAvailabilityEvent = calendarAvailabilities["user-1"][0]

    expect(calendarEntry).toBeDefined()
    expect(calendarEntry.error).toBe("true")
    expect(normalizedCalendarEvent).toBeDefined()
    expect(normalizedAvailabilityEvent).toBeDefined()
    expect(normalizedCalendarEvent?.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedCalendarEvent?.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedAvailabilityEvent.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedAvailabilityEvent.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
  })

  it("decodes both calendar transport response modes before downstream consumers see them", async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({
        "google:user@example.com": {
          error: true,
          calendarEvents: [
            {
              calendarId: "primary",
              startDate: epochMs("2026-01-03T09:00:00Z"),
              endDate: epochMs("2026-01-03T10:00:00Z"),
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        "user-1": [
          {
            calendarId: "primary",
            startDate: epochMs("2026-01-03T11:00:00Z"),
            endDate: epochMs("2026-01-03T12:00:00Z"),
          },
        ],
      })

    const eventQuery = {
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-01-03")],
      timeSeed: zdt("2026-01-03T09:00:00Z"),
    }
    const calendarEventsMap = await fetchCalendarEventsMap(eventQuery)
    const calendarAvailabilities = await fetchCalendarAvailabilities(eventQuery, {
      eventId: "evt-1",
    })

    expect(calendarEventsMap["google:user@example.com"].error).toBe("true")
    expect(
      calendarEventsMap["google:user@example.com"].calendarEvents?.[0]?.startDate
    ).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(calendarAvailabilities["user-1"][0]?.startDate).toBeInstanceOf(
      Temporal.ZonedDateTime
    )
  })

  it("decodes raw /user/calendars payloads at the calendar-events fetch boundary", async () => {
    vi.mocked(get).mockResolvedValue({
      "google:user@example.com": {
        error: false,
        calendarEvents: [
          {
            calendarId: "primary",
            startDate: epochMs("2026-01-03T09:00:00Z"),
            endDate: epochMs("2026-01-03T10:00:00Z"),
          },
        ],
      },
    })

    const calendarEventsMap = await fetchUserCalendarEventsMap({
      timeMin: Temporal.Instant.from("2026-01-03T00:00:00Z"),
      timeMax: Temporal.Instant.from("2026-01-03T23:59:59Z"),
    })
    const entry = calendarEventsMap["google:user@example.com"]

    expect(get).toHaveBeenCalledWith(
      "/user/calendars?timeMin=2026-01-03T00:00:00Z&timeMax=2026-01-03T23:59:59Z"
    )
    expect(entry.error).toBeUndefined()
    expect(entry.calendarEvents?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(entry.calendarEvents?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
  })

  it("decodes raw event and folder lists before store-level consumption", async () => {
    vi.mocked(get)
      .mockResolvedValueOnce([
        {
          _id: "evt-1",
          dates: [epochMs("2026-01-04T09:00:00Z")],
          duration: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "folder-1",
          name: "Planning",
        },
      ])

    const events = await fetchUserEvents()
    const folders = await fetchUserFolders()

    expect(events[0].dates?.[0]).toBeInstanceOf(Temporal.PlainDate)
    expect(events[0].timeSeed).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(folders).toEqual([{ _id: "folder-1", name: "Planning" }])
  })

  it("encodes canonical event patch payloads at an explicit mutation boundary", () => {
    const payload = toEventPatchPayload({
      name: "Planning",
      duration: Temporal.Duration.from({ hours: 2 }),
      dates: [Temporal.PlainDate.from("2026-01-05")],
      timeSeed: zdt("2026-01-05T09:00:00Z"),
      type: eventTypes.SPECIFIC_DATES,
      signUpBlocks: [
        {
          _id: "block-1",
          name: "Slot 1",
          capacity: 2,
          startDate: zdt("2026-01-05T09:00:00Z"),
          endDate: zdt("2026-01-05T10:00:00Z"),
        },
      ],
      times: [zdt("2026-01-05T09:00:00Z")],
      remindees: [{ email: "ada@example.com" }],
    })

    expect(payload).toEqual({
      name: "Planning",
      duration: 2,
      dates: ["2026-01-05T09:00:00Z"],
      type: eventTypes.SPECIFIC_DATES,
      description: undefined,
      signUpBlocks: [
        {
          _id: "block-1",
          name: "Slot 1",
          capacity: 2,
          startDate: epochMs("2026-01-05T09:00:00Z"),
          endDate: epochMs("2026-01-05T10:00:00Z"),
        },
      ],
      times: [epochMs("2026-01-05T09:00:00Z")],
      remindees: ["ada@example.com"],
    })
  })

  it("encodes event membership dates through Temporal at the transport boundary", () => {
    const payload = toRawEvent({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Temporal.PlainDate.from("2026-01-05"),
        Temporal.PlainDate.from("2026-01-06"),
      ],
      timeSeed: zdt("2026-01-05T09:00:00Z"),
    })

    expect(payload.dates).toEqual([
      epochMs("2026-01-05T09:00:00Z"),
      epochMs("2026-01-06T09:00:00Z"),
    ])
  })

  it("encodes nested group-response calendar options through the transport boundary", () => {
    const calendarOptions = {
      bufferTime: { enabled: true, time: 15 },
      workingHours: { enabled: true, startTime: 9, endTime: 17 },
    }

    const payload = toGroupResponseSubmissionPayload({
      sharedCalendarAccounts: {
        "ada@example.com_google": {
          enabled: true,
          subCalendars: {
            primary: { enabled: true },
          },
        },
      },
      manualAvailability: new ZdtMap([
        [
          zdt("2026-01-03T00:00:00Z"),
          new ZdtSet([zdt("2026-01-03T09:00:00Z")]),
        ],
      ]),
      calendarOptions,
    })

    expect(payload.calendarOptions).toEqual(toRawCalendarOptions(calendarOptions))
    expect(payload.manualAvailability["2026-01-03T00:00:00+00:00[UTC]"]).toEqual([
      epochMs("2026-01-03T09:00:00Z"),
    ])
  })

  it("reuses the shared populated sign-up block model instead of redefining nested user shapes", () => {
    const populatedBlock: SignUpBlockWithResponses = {
      _id: "block-1",
      name: "Slot 1",
      capacity: 2,
      responses: [
        {
          userId: "user-1",
          user: {
            _id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
            picture: "https://example.com/ada.png",
          },
        },
      ],
    }

    expect(populatedBlock.responses?.[0]?.user?.firstName).toBe("Ada")
  })
})
