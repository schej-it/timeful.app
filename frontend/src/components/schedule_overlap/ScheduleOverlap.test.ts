// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { eventTypes, UTC } from "@/constants"
import ScheduleOverlap from "./ScheduleOverlap.vue"

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    smAndDown: { value: false },
  }),
}))

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
  } as Storage
}

const mountScheduleOverlap = () =>
  shallowMount(ScheduleOverlap, {
    props: {
      event: {
        _id: "evt-1",
        name: "Overnight event",
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T23:00:00Z")],
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
    },
    global: {
      stubs: {
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
        SignUpBlocksList: true,
        SignUpCalendarBlock: true,
        SpecificTimesInstructions: true,
        ToolRow: true,
        Tooltip: {
          template: "<div><slot /></div>",
        },
        WorkingHoursToggle: true,
        ZigZag: true,
      },
    },
  })

describe("ScheduleOverlap", () => {
  beforeEach(() => {
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
  })

  it("renders overnight split calendar events without comparing Temporal.Duration via valueOf", () => {
    expect(() => mountScheduleOverlap()).not.toThrow()
  })
})
