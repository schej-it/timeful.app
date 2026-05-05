import { shallowMount } from "@vue/test-utils"
import { vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { eventTypes, UTC } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import { createLocalStorageMock } from "@/test/localStorage"
import { ZdtMap } from "@/utils"
import ScheduleOverlap from "./ScheduleOverlap.vue"
import type {
  ScheduleOverlapMobileOverlayViewModel,
  ScheduleOverlapRespondentsPanelViewModel,
  ScheduleOverlapSidebarViewModel,
} from "./scheduleOverlapViewModels"

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

export const buildScheduleOverlapSidebarViewModel =
  (): ScheduleOverlapSidebarViewModel => ({
    event: buildScheduleOverlapProps().event,
    state: states.EDIT_AVAILABILITY,
    isSignUp: false,
    isOwner: false,
    isGroup: false,
    isPhone: false,
    authUser: null,
    alreadyRespondedToSignUpForm: false,
    signUpBlocks: [],
    signUpBlocksToAdd: [],
    numTempTimes: 0,
    curGuestId: "",
    userHasResponded: false,
    addingAvailabilityAsGuest: false,
    canEditGuestName: false,
    newGuestName: "",
    editGuestNameDialog: false,
    availabilityType: "available",
    showOverlayAvailabilityToggle: false,
    overlayAvailability: false,
    calendarPermissionGranted: false,
    calendarEventsMap: {},
    sharedCalendarAccounts: {},
    showCalendarOptions: true,
    showEditOptions: false,
    calendarOptionsDialog: false,
    bufferTime: { enabled: false, time: 0 },
    workingHours: { enabled: false, startTime: 9, endTime: 17 },
    curTimezone: buildRespondentsPanelViewModel().timezone,
    deleteAvailabilityDialog: false,
    showAds: false,
    rightSideWidth: "320px",
    respondentsPanel: buildRespondentsPanelViewModel(),
  })

export const buildScheduleOverlapMobileOverlayViewModel =
  (): ScheduleOverlapMobileOverlayViewModel => ({
    bottomOffset: "4rem",
    hintTextShown: false,
    hintText: "",
    isGroup: false,
    editing: false,
    isSignUp: false,
    availabilityType: "available",
    isWeekly: false,
    calendarPermissionGranted: false,
    weekOffset: 0,
    event: buildRespondentsPanelViewModel().event,
    showStickyRespondents: true,
    respondentsPanel: buildRespondentsPanelViewModel(),
    state: states.HEATMAP,
    numTempTimes: 0,
  })

export const installScheduleOverlapTestGlobals = () => {
  vi.stubGlobal("localStorage", createLocalStorageMock())
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        text: () => Promise.resolve("{}"),
      })
    )
  )
}

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
