import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, ref, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  fromRawCalendarEvent,
  fromRawEvent,
  fromRawResponse,
  fromRawSignUpBlock,
} from "@/types"
import {
  getDateWithTimezone,
  normalizePluginSetSlots,
  resolveTimezoneValue,
  resolvePluginTimezoneValue,
  validateDOWPayload,
  ZdtMap,
  ZdtSet,
  zdtKey,
  zdtSetHas,
  zdtMapGetOrInsert,
} from "@/utils"
import { durations, eventTypes, UTC } from "@/constants"
import {
  getNumCurRespondentsForDay,
  useAvailabilityData,
} from "@/composables/schedule_overlap/useAvailabilityData"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import { useEventScheduling } from "@/composables/schedule_overlap/useEventScheduling"
import { useCalendarGrid } from "@/composables/schedule_overlap/useCalendarGrid"
import {
  fromCalendarAvailabilitiesTransportMap,
  fromCalendarEventsTransportMap,
} from "@/composables/event/calendarEventsBoundary"
import { toScheduleOverlapEvent } from "@/composables/schedule_overlap/types"
import type { ResponsesFormatted } from "@/composables/schedule_overlap/types"
import { states, type DayItem, type TimeItem } from "@/composables/schedule_overlap/types"
import {
  getPluginEventTimeRange,
  normalizePluginResponses,
} from "@/views/event/pluginResponsesBoundary"

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

const createLocalStorageMock = () => {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    get length() {
      return store.size
    },
  } as Storage & Record<string, string>
}

const makeAvailabilityData = (eventType: string = eventTypes.SPECIFIC_DATES) => {
  const day = zdt("2026-01-01T09:00:00Z")
  const dayItem: DayItem = {
    dayText: "thu",
    dateString: "jan 1",
    dateObject: day,
    isConsecutive: true,
  }
  const timeItem: TimeItem = {
    hoursOffset: durations.ZERO,
    text: "9 AM",
  }

  return useAvailabilityData({
    event: ref({
      _id: "evt-1",
      type: eventType,
      dates: [day],
      duration: durations.ONE_HOUR,
    } as never),
    weekOffset: ref(0),
    state: ref(states.EDIT_AVAILABILITY),
    curGuestId: ref(""),
    addingAvailabilityAsGuest: ref(false),
    showSnackbar: ref(false),
    calendarPermissionGranted: ref(false),
    loadingCalendarEvents: ref(false),
    allDays: computed(() => [dayItem]),
    days: computed(() => [dayItem]),
    times: computed(() => [timeItem]),
    splitTimes: computed(() => [[timeItem], []]),
    timeslotDuration: computed(() => durations.ONE_HOUR),
    page: ref(0),
    maxDaysPerPage: computed(() => 7),
    isGroup: computed(() => eventType === eventTypes.GROUP),
    isOwner: computed(() => false),
    guestNameKey: computed(() => "guestName"),
    guestName: computed(() => undefined),
    getDateFromRowCol: (row: number, col: number) =>
      row === 0 && col === 0 ? zdt("2026-01-01T09:00:00Z") : null,
    calendarEventsByDay: computed(() => []),
    groupCalendarEventsByDay: computed(() => ({})),
    bufferTime: ref({ enabled: false, time: 0 }),
    workingHours: ref({ enabled: false, startTime: 9, endTime: 17 }),
    getAvailabilityFromCalendarEvents: () => new ZdtSet(),
    refreshEvent: vi.fn(),
  })
}

const makeCalendarEventsHarness = ({
  slotStart,
  timeslotDuration = durations.ONE_HOUR,
  curTimezoneValue = UTC,
  curTimezoneOffset = durations.ZERO,
}: {
  slotStart: Temporal.ZonedDateTime
  timeslotDuration?: Temporal.Duration
  curTimezoneValue?: string
  curTimezoneOffset?: Temporal.Duration
}) => {
  return useCalendarEvents({
    event: ref({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [zdt("2026-01-01T00:00:00Z")],
      duration: durations.ONE_HOUR,
    }),
    weekOffset: ref(0),
    curTimezone: ref({
      value: curTimezoneValue,
      offset: curTimezoneOffset,
      label: curTimezoneValue || "Custom",
      gmtString: curTimezoneValue || "GMT",
    }),
    calendarEventsMap: ref({}),
    calendarAvailabilities: ref({}),
    addingAvailabilityAsGuest: ref(false),
    calendarOnly: ref(false),
    allDays: computed(() => [
      {
        dayText: "thu",
        dateString: "jan 1",
        dateObject: zdt("2026-01-01T00:00:00Z"),
        isConsecutive: true,
      },
    ]),
    times: computed(() => [{ hoursOffset: durations.ZERO, text: "slot" }]),
    timeslotDuration: computed(() => timeslotDuration),
    timezoneOffset: computed(() => durations.ZERO),
    isGroup: computed(() => false),
    guestName: computed(() => undefined),
    getDateFromDayTimeIndex: (dayIndex: number, timeIndex: number) =>
      dayIndex === 0 && timeIndex === 0 ? slotStart : null,
    fetchedResponses: ref({}),
    loadingResponses: ref({
      loading: false,
      lastFetched: zdt("2026-01-01T00:00:00Z"),
    }),
  })
}

const makeEventSchedulingHarness = ({
  slotStart,
  curTimezoneValue = UTC,
  curTimezoneOffset = durations.ZERO,
}: {
  slotStart: Temporal.ZonedDateTime
  curTimezoneValue?: string
  curTimezoneOffset?: Temporal.Duration
}) => {
  const tempTimes = ref(new ZdtSet()) as Ref<ZdtSet>

  return useEventScheduling({
    event: ref({
      _id: "evt-1",
      shortId: "abc123",
      name: "Planning Session",
      location: "Room 42",
      type: eventTypes.SPECIFIC_DATES,
      dates: [zdt("2026-01-01T00:00:00Z")],
      duration: durations.ONE_HOUR,
    }),
    weekOffset: ref(0),
    curTimezone: ref({
      value: curTimezoneValue,
      offset: curTimezoneOffset,
      label: curTimezoneValue || "Custom",
      gmtString: curTimezoneValue || "GMT",
    }),
    state: ref(states.EDIT_AVAILABILITY),
    defaultState: computed(() => states.EDIT_AVAILABILITY),
    splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
    timeslotDuration: computed(() => durations.ONE_HOUR),
    timeslotHeight: computed(() => 16),
    timezoneOffset: computed(() => durations.ZERO),
    isWeekly: computed(() => false),
    isGroup: computed(() => false),
    isSpecificTimes: computed(() => true),
    getDateFromRowCol: (row: number, col: number) =>
      row === 0 && col === 0 ? slotStart : null,
    getMinMaxHoursFromTimes: () => ({
      minHours: Temporal.PlainTime.from("09:00"),
      maxHours: Temporal.PlainTime.from("10:00"),
    }),
    dragging: ref(false),
    dragStart: ref(null),
    dragCur: ref(null),
    tempTimes,
    respondents: computed(() => [{ email: "guest@example.com" }]),
  })
}

describe("Temporal regressions", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("reconstructs epoch-millisecond API fields without invalid ZonedDateTime bags", () => {
    expect(() =>
      fromRawEvent({
        dates: [0],
        times: [60 * 60 * 1000],
        duration: 1,
      })
    ).not.toThrow()

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

  it("matches equal Temporal.Duration values when sizing schedule rows", () => {
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T00:00:00Z")],
        duration: durations.ONE_HOUR,
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state: ref(states.EDIT_AVAILABILITY),
      isPhone: ref(false),
    })

    expect(grid.timeslotHeight.value).toBe(grid.HOUR_HEIGHT / 2)
  })

  it("normalizes raw event extras before schedule-overlap consumes them", () => {
    const event = fromRawEvent({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Date.parse("2026-01-01T00:00:00Z")],
      duration: 1,
      scheduledEvent: {
        calendarId: "primary",
        startDate: Date.parse("2026-01-01T11:00:00Z"),
        endDate: Date.parse("2026-01-01T12:00:00Z"),
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
          startDate: Date.parse("2026-01-01T09:00:00Z"),
          endDate: Date.parse("2026-01-01T10:00:00Z"),
        },
      ],
    })

    const normalized = toScheduleOverlapEvent(event)

    expect(event.scheduledEvent?.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.scheduledEvent?.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
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
            startDate: Date.parse("2026-01-01T09:00:00Z"),
            endDate: Date.parse("2026-01-01T10:00:00Z"),
          },
        ],
      },
    })
    const calendarAvailabilities = fromCalendarAvailabilitiesTransportMap({
      "user-1": [
        {
          calendarId: "primary",
          startDate: Date.parse("2026-01-02T09:00:00Z"),
          endDate: Date.parse("2026-01-02T10:00:00Z"),
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
    expect(normalizedCalendarEvent?.startDate).toBeInstanceOf(
      Temporal.ZonedDateTime
    )
    expect(normalizedCalendarEvent?.endDate).toBeInstanceOf(
      Temporal.ZonedDateTime
    )
    expect(normalizedAvailabilityEvent.startDate).toBeInstanceOf(
      Temporal.ZonedDateTime
    )
    expect(normalizedAvailabilityEvent.endDate).toBeInstanceOf(
      Temporal.ZonedDateTime
    )
  })

  it("finds both min and max local hours from unsorted Temporal event times", () => {
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T00:00:00Z")],
        duration: durations.ONE_HOUR,
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state: ref(states.EDIT_AVAILABILITY),
      isPhone: ref(false),
    })

    const { minHours, maxHours } = grid.getMinMaxHoursFromTimes([
      zdt("2026-01-01T11:00:00Z"),
      zdt("2026-01-01T09:00:00Z"),
    ])

    expect(minHours.toString()).toBe("09:00:00")
    expect(maxHours.toString()).toBe("11:00:00")
  })

  it("treats equal ZonedDateTime values as the same slot in availability lookups", () => {
    const availabilityData = makeAvailabilityData()
    const slot = zdt("2026-01-01T09:00:00Z")

    const columnAvailability = availabilityData.getAvailabilityForColumn(
      0,
      new ZdtSet([slot])
    )

    expect(columnAvailability.size).toBe(1)
    expect([...columnAvailability][0].toInstant().toString()).toBe(slot.toInstant().toString())
  })

  it("handles legacy manual group availability keys stored as epoch-millisecond strings", () => {
    const availabilityData = makeAvailabilityData(eventTypes.GROUP)

    expect(() =>
      availabilityData.getFetchedManualAvailabilityDow({
        "1777760423186": [zdt("2026-01-01T09:00:00Z")],
      })
    ).not.toThrow()
  })

  it("converts manual group availability through value-keyed Temporal lookups", () => {
    const availabilityData = makeAvailabilityData(eventTypes.GROUP)
    const dayKey = zdt("2026-01-01T09:00:00Z")
    const equalDayKey = Temporal.ZonedDateTime.from(dayKey.toString())
    const slot = zdt("2026-01-01T10:00:00Z")
    const equalSlot = Temporal.ZonedDateTime.from(slot.toString())

    const dowAvailability = availabilityData.getManualAvailabilityDow(
      new ZdtMap([[dayKey, new ZdtSet([slot])]])
    )
    const dowAvailabilityFromEqualKeys = availabilityData.getManualAvailabilityDow(
      new ZdtMap([[equalDayKey, new ZdtSet([equalSlot])]])
    )

    expect(Object.keys(dowAvailability)).toHaveLength(1)
    expect(dowAvailabilityFromEqualKeys).toEqual(dowAvailability)

    const [normalizedDay, normalizedSlots] = Object.entries(dowAvailability)[0]
    const [normalizedSlot] = [...normalizedSlots]
    const equalNormalizedSlot = Temporal.ZonedDateTime.from(
      normalizedSlot.toString()
    )

    expect(Number(normalizedDay)).not.toBeNaN()
    expect(normalizedSlots.has(equalNormalizedSlot)).toBe(true)
  })

  it("counts days-only respondents with value-based ZonedDateTime map lookups", () => {
    const storedDay = zdt("2026-01-01T00:00:00Z")
    const queriedDay = zdt("2026-01-01T00:00:00Z")
    const responsesFormatted: ResponsesFormatted = new ZdtMap([
      [storedDay, new Set(["user-1", "user-2"])],
    ])

    expect(
      getNumCurRespondentsForDay(
        responsesFormatted,
        queriedDay,
        new Set(["user-2", "user-3"])
      )
    ).toBe(1)
  })

  it("reuses equal ZonedDateTime keys without growing value-keyed maps", () => {
    const map = new ZdtMap<ZdtSet>()
    const first = zdt("2026-01-01T09:00:00Z")
    const second = zdt("2026-01-01T09:00:00Z")

    const created = zdtMapGetOrInsert(map, first, () => new ZdtSet([first]))
    const reused = zdtMapGetOrInsert(map, second, () => new ZdtSet([second]))

    expect(reused).toBe(created)
    expect(map.size).toBe(1)
  })

  it("uses epoch-nanosecond bigint keys for equal instants across timezones", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const laDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "America/Los_Angeles"
    )

    expect(typeof zdtKey(utcDate)).toBe("bigint")
    expect(zdtKey(utcDate)).toBe(utcDate.epochNanoseconds)
    expect(zdtKey(laDate)).toBe(utcDate.epochNanoseconds)
  })

  it("deletes equal ZonedDateTime values from ZdtSet even when timezone annotations differ", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const laDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "America/Los_Angeles"
    )
    const set = new ZdtSet([utcDate])

    expect(set.has(laDate)).toBe(true)
    expect(set.delete(laDate)).toBe(true)
    expect(set.size).toBe(0)
  })

  it("checks equal ZonedDateTime values through zdtSetHas on canonical ZdtSet inputs", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const viennaDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "Europe/Vienna"
    )
    const set = new ZdtSet([utcDate])

    expect(zdtSetHas(set, viennaDate)).toBe(true)
  })

  it("updates one ZdtMap entry for equal instants across different timezones", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const viennaDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "Europe/Vienna"
    )
    const map = new ZdtMap<string>([[utcDate, "first"]])

    map.set(viennaDate, "second")

    expect(map.size).toBe(1)
    expect(map.get(utcDate)).toBe("second")
    expect(map.get(viennaDate)).toBe("second")
  })

  it("compares Temporal date ranges without relational operators in availability checks", () => {
    const availabilityData = makeAvailabilityData()
    const slot = zdt("2026-01-01T09:00:00Z")

    expect(availabilityData.isTouched(slot, [slot])).toBe(true)
  })

  it("compares Temporal calendar event bounds without relational operators", () => {
    const calendarEvents = useCalendarEvents({
      event: ref({
        _id: "evt-1",
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T00:00:00Z")],
        duration: durations.ONE_HOUR,
      }),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      calendarEventsMap: ref({}),
      calendarAvailabilities: ref({}),
      addingAvailabilityAsGuest: ref(false),
      calendarOnly: ref(false),
      allDays: computed(() => [
        {
          dayText: "thu",
          dateString: "jan 1",
          dateObject: zdt("2026-01-01T00:00:00Z"),
          isConsecutive: true,
        },
      ]),
      times: computed(() => [{ hoursOffset: durations.ZERO, text: "9 AM" }]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timezoneOffset: computed(() => durations.ZERO),
      isGroup: computed(() => false),
      guestName: computed(() => undefined),
      getDateFromDayTimeIndex: (dayIndex: number, timeIndex: number) =>
        dayIndex === 0 && timeIndex === 0 ? zdt("2026-01-01T09:00:00Z") : null,
      fetchedResponses: ref({}),
      loadingResponses: ref({
        loading: false,
        lastFetched: zdt("2026-01-01T00:00:00Z"),
      }),
    })

    expect(() =>
      calendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [
          [
            {
              startDate: zdt("2026-01-01T09:30:00Z"),
              endDate: zdt("2026-01-01T10:00:00Z"),
              free: false,
            },
          ],
        ],
      })
    ).not.toThrow()
  })

  it("keeps slots available when busy events only touch the slot boundary", () => {
    const slot = zdt("2026-01-01T08:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({ slotStart: slot })

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [
        [
          {
            startDate: zdt("2026-01-01T07:00:00Z"),
            endDate: zdt("2026-01-01T08:00:00Z"),
            free: false,
          },
          {
            startDate: zdt("2026-01-01T09:00:00Z"),
            endDate: zdt("2026-01-01T10:00:00Z"),
            free: false,
          },
        ],
      ],
    })

    expect(availability.has(slot)).toBe(true)
  })

  it("keeps buffered boundary-touching slots available", () => {
    const slot = zdt("2026-01-01T08:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({ slotStart: slot })
    calendarEvents.bufferTime.value = { enabled: true, time: 30 }

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [
        [
          {
            startDate: zdt("2026-01-01T09:30:00Z"),
            endDate: zdt("2026-01-01T10:30:00Z"),
            free: false,
          },
        ],
      ],
    })

    expect(availability.has(slot)).toBe(true)
  })

  it("supports cross-midnight working-hours windows with 30-minute slots", () => {
    const insideSlot = zdt("2026-01-01T23:30:00Z")
    const calendarEvents = makeCalendarEventsHarness({
      slotStart: insideSlot,
      timeslotDuration: durations.THIRTY_MINUTES,
    })

    calendarEvents.workingHours.value = {
      enabled: true,
      startTime: 22.5,
      endTime: 1.5,
    }

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [[]],
    })

    expect(availability.has(insideSlot)).toBe(true)
  })

  it("applies working-hours boundaries in the selected schedule timezone", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: UTC,
        offset: "PT0S",
        label: "UTC",
        gmtString: "GMT",
      })
    )

    const beforeWorkingHours = zdt("2025-12-31T16:00:00Z")
    const atWorkingHoursStart = zdt("2025-12-31T17:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({
      slotStart: beforeWorkingHours,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "America/Los_Angeles",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const beforeAvailability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [[]],
      calendarOptions: {
        bufferTime: { enabled: false, time: 15 },
        workingHours: {
          enabled: true,
          startTime: 9,
          endTime: 17,
        },
      },
    })

    expect(beforeAvailability.has(beforeWorkingHours)).toBe(false)

    const startBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: atWorkingHoursStart,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "America/Los_Angeles",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const boundaryAvailability =
      startBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions: {
          bufferTime: { enabled: false, time: 15 },
          workingHours: {
            enabled: true,
            startTime: 9,
            endTime: 17,
          },
        },
      })

    expect(boundaryAvailability.has(atWorkingHoursStart)).toBe(true)
  })

  it("applies working-hours boundaries in offset-only schedule timezones", () => {
    const beforeWorkingHours = zdt("2025-12-31T16:30:00Z")
    const atWorkingHoursStart = zdt("2025-12-31T17:00:00Z")
    const calendarOptions = {
      bufferTime: { enabled: false, time: 15 },
      workingHours: {
        enabled: true,
        startTime: 9,
        endTime: 17,
      },
    }

    const beforeBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: beforeWorkingHours,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const beforeAvailability =
      beforeBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(beforeAvailability.has(beforeWorkingHours)).toBe(false)

    const startBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: atWorkingHoursStart,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const boundaryAvailability =
      startBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(boundaryAvailability.has(atWorkingHoursStart)).toBe(true)
  })

  it("preserves offset-only schedule timezones in calendar export URLs", () => {
    const slot = zdt("2026-01-01T09:00:00Z")
    const scheduleTimezoneOffset = Temporal.Duration.from({
      hours: 5,
      minutes: 45,
    })
    const openMock = vi
      .fn<(url?: string | URL, target?: string) => Window | null>()
      .mockReturnValue(null)
    vi.stubGlobal("window", { open: openMock })

    const googleScheduling = makeEventSchedulingHarness({
      slotStart: slot,
      curTimezoneValue: "",
      curTimezoneOffset: scheduleTimezoneOffset,
    })
    googleScheduling.curScheduledEvent.value = { row: 0, col: 0, numRows: 1 }
    googleScheduling.confirmScheduleEvent(true)

    const googleUrl = openMock.mock.calls[0]?.[0]
    expect(typeof googleUrl).toBe("string")
    expect(new URL(String(googleUrl)).searchParams.get("ctz")).toBe("+05:45")

    const outlookScheduling = makeEventSchedulingHarness({
      slotStart: slot,
      curTimezoneValue: "",
      curTimezoneOffset: scheduleTimezoneOffset,
    })
    outlookScheduling.curScheduledEvent.value = { row: 0, col: 0, numRows: 1 }
    outlookScheduling.confirmScheduleEvent(false)

    const outlookUrl = openMock.mock.calls[1]?.[0]
    expect(typeof outlookUrl).toBe("string")
    expect(new URL(String(outlookUrl)).searchParams.get("timezone")).toBe(
      "+05:45"
    )
  })

  it("keeps specific-times day labels on the intended civil date across DST changes", () => {
    const timezone = "America/Los_Angeles"
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        hasSpecificTimes: true,
        dates: [
          "2026-03-07",
          "2026-03-08",
          "2026-03-09",
          "2026-03-10",
        ].map((day) =>
          Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
        ),
        duration: durations.ONE_HOUR,
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: timezone,
        offset: durations.ZERO,
        label: timezone,
        gmtString: timezone,
      }),
      state: ref(states.SET_SPECIFIC_TIMES),
      isPhone: ref(false),
    })

    expect(
      grid.allDays.value.map((day) => `${day.dayText} ${day.dateString}`)
    ).toEqual([
      "sat mar 7",
      "sun mar 8",
      "mon mar 9",
      "tue mar 10",
    ])
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

    const result = normalizePluginSetSlots(
      slots,
      "America/Los_Angeles",
      eventTypes.DOW
    )

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

    const result = normalizePluginSetSlots(
      slots,
      "America/Los_Angeles",
      eventTypes.DOW
    )

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
    expect(result.slots[0].parsedStart.toPlainDate().toString()).toBe(
      "2018-06-19"
    )
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

    const timezoneValue = resolveTimezoneValue(
      undefined,
      localStorage,
      "America/New_York"
    )

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
    expect(slots["user-1"].availability[0].timeZoneId).toBe(
      "America/Los_Angeles"
    )
    expect(slots["user-1"].availability[0].hour).toBe(9)
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
    const secondDate = event.dates?.[1]
    if (!secondDate) throw new Error("Expected normalized event dates")

    const range = getPluginEventTimeRange(event, 0)
    if (!range) throw new Error("Expected plugin event time range")

    expect(range.timeMin).toBe(event.dates?.[0])
    expect(range.timeMax.equals(secondDate.add({ days: 1 }))).toBe(true)
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

    const range = getPluginEventTimeRange(
      event,
      1,
      zdt("2026-01-18T00:00:00Z")
    )
    if (!range) throw new Error("Expected plugin event time range")

    expect(range.timeMin.toInstant().toString()).toBe("2026-01-19T17:00:00Z")
    expect(range.timeMax.toInstant().toString()).toBe("2026-01-22T17:00:00Z")
  })
})
