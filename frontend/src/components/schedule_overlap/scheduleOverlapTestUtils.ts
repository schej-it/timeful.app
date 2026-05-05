import { shallowMount } from "@vue/test-utils"
import { Temporal } from "temporal-polyfill"
import { eventTypes, UTC } from "@/constants"
import { ZdtMap } from "@/utils"
import ScheduleOverlap from "./ScheduleOverlap.vue"
import type { ScheduleOverlapRespondentsPanelViewModel } from "./respondentsPanelTypes"

export const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

export const scheduleOverlapGlobalStubs = {
  "v-btn": true,
  "v-card": true,
  "v-card-actions": true,
  "v-card-text": true,
  "v-card-title": true,
  "v-dialog": true,
  "v-expand-transition": true,
  "v-icon": true,
  "v-progress-circular": true,
  "v-spacer": true,
  "v-switch": true,
  "v-text-field": true,
  AlertText: true,
  AvailabilityTypeToggle: true,
  BufferTimeSwitch: true,
  CalendarAccounts: true,
  CalendarEventBlock: true,
  ColorLegend: true,
  ExpandableSection: true,
  GCalWeekSelector: true,
  PubliftAd: true,
  RespondentsList: true,
  ScheduleOverlapMobileOverlay: true,
  SignUpBlocksList: true,
  SignUpCalendarBlock: true,
  SpecificTimesInstructions: true,
  ToolRow: true,
  Tooltip: {
    template: "<div><slot /></div>",
  },
  WorkingHoursToggle: true,
  ZigZag: true,
}

export const buildScheduleOverlapProps = () => ({
  event: {
    _id: "evt-1",
    name: "Overnight event",
    type: eventTypes.SPECIFIC_DATES,
    dates: [Temporal.PlainDate.from("2026-01-01")],
    timeSeed: zdt("2026-01-01T23:00:00Z"),
    startTime: Temporal.PlainTime.from("23:00"),
    duration: Temporal.Duration.from({ hours: 2 }),
    daysOnly: false,
  },
  alwaysShowCalendarEvents: true,
  sampleCalendarEventsByDay: [
    [
      {
        id: "cal-1",
        startDate: zdt("2026-01-02T00:00:00Z"),
        endDate: zdt("2026-01-02T00:30:00Z"),
        hoursOffset: Temporal.Duration.from({ hours: 1 }),
        hoursLength: Temporal.Duration.from({ minutes: 30 }),
        free: false,
        calendarId: "primary",
      },
    ],
  ],
})

export const buildRespondentsPanelViewModel =
  (): ScheduleOverlapRespondentsPanelViewModel => ({
    event: buildScheduleOverlapProps().event,
    eventId: "evt-1",
    days: [zdt("2026-01-01T23:00:00Z")],
    times: [],
    curDate: zdt("2026-01-01T23:00:00Z"),
    curRespondent: "",
    curRespondents: [],
    curTimeslot: { dayIndex: 0, timeIndex: 0 },
    curTimeslotAvailability: {},
    respondents: [],
    parsedResponses: {},
    isOwner: false,
    isGroup: false,
    attendees: [],
    responsesFormatted: new ZdtMap<Set<string>>(),
    timezone: {
      value: UTC,
      offset: Temporal.Duration.from({ hours: 0 }),
      label: "UTC",
      gmtString: "GMT+0",
    },
    showCalendarEvents: true,
    showBestTimes: false,
    hideIfNeeded: false,
    showEventOptions: false,
    guestAddedAvailability: false,
    addingAvailabilityAsGuest: false,
  })

export const mountScheduleOverlap = (
  options: {
    props?: Record<string, unknown>
    global?: { stubs?: Record<string, unknown> }
  } = {}
) => {
  const { props, global, ...mountOptions } = options

  return shallowMount(ScheduleOverlap as never, {
    ...mountOptions,
    props: {
      ...buildScheduleOverlapProps(),
      ...(props ?? {}),
    },
    global: {
      ...global,
      stubs: {
        ...scheduleOverlapGlobalStubs,
        ...(global?.stubs ?? {}),
      },
    },
  } as never)
}
