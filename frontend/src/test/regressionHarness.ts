import { computed, ref, type Ref } from "vue"
import { vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC, type EventTypeValue } from "@/constants"
import { ZdtSet } from "@/utils"
import { useAvailabilityData } from "@/composables/schedule_overlap/useAvailabilityData"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import { useEventScheduling } from "@/composables/schedule_overlap/useEventScheduling"
import { states, type DayItem, type TimeItem } from "@/composables/schedule_overlap/types"

export const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

export const makeAvailabilityData = (
  eventType: string = eventTypes.SPECIFIC_DATES
) => {
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
      dates: [day.toPlainDate()],
      timeSeed: day,
      duration: durations.ONE_HOUR,
    } as never),
    weekOffset: ref(0),
    state: ref(states.EDIT_AVAILABILITY),
    fetchedResponses: ref({}),
    loadingResponses: ref({
      loading: false,
      lastFetched: day,
    }),
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

export const makeCalendarEventsHarness = ({
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
      dates: [Temporal.PlainDate.from("2026-01-01")],
      timeSeed: zdt("2026-01-01T00:00:00Z"),
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

export const makeEventSchedulingHarness = ({
  slotStart,
  eventType = eventTypes.SPECIFIC_DATES,
  dates = [Temporal.PlainDate.from("2026-01-01")],
  timeSeed = zdt("2026-01-01T00:00:00Z"),
  weekOffset = 0,
  startOnMonday = false,
  curTimezoneValue = UTC,
  curTimezoneOffset = durations.ZERO,
}: {
  slotStart: Temporal.ZonedDateTime
  eventType?: EventTypeValue
  dates?: Temporal.PlainDate[]
  timeSeed?: Temporal.ZonedDateTime
  weekOffset?: number
  startOnMonday?: boolean
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
      type: eventType,
      dates,
      timeSeed,
      duration: durations.ONE_HOUR,
      startOnMonday,
    }),
    weekOffset: ref(weekOffset),
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
    isWeekly: computed(() => eventType === eventTypes.DOW),
    isGroup: computed(() => eventType === eventTypes.GROUP),
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
