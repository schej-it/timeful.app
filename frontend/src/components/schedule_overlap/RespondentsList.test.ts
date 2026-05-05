// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, UTC } from "@/constants"
import { ZdtMap, ZdtSet } from "@/utils"
import RespondentsList from "./RespondentsList.vue"

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: { value: null },
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: { value: true },
  }),
}))

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

const mountRespondentsList = ({
  curDate,
  setEntry,
  timezone = UTC,
}: {
  curDate: Temporal.ZonedDateTime
  setEntry: Temporal.ZonedDateTime
  timezone?: string
}) =>
  shallowMount(RespondentsList, {
    props: {
      eventId: "evt-1",
      event: {
        blindAvailabilityEnabled: false,
        collectEmails: false,
        dates: [curDate.toPlainDate()],
        timeSeed: curDate,
        duration: durations.ONE_HOUR,
        daysOnly: false,
      },
      days: [],
      times: [],
      curDate,
      curRespondent: "",
      curRespondents: [],
      curTimeslot: { dayIndex: -1, timeIndex: -1 },
      curTimeslotAvailability: { "user-1": true },
      respondents: [
        {
          _id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      ],
      parsedResponses: {
        "user-1": {
          user: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
          availability: new ZdtSet(),
          ifNeeded: new ZdtSet([setEntry]),
        },
      },
      isOwner: false,
      isGroup: false,
      showCalendarEvents: false,
      responsesFormatted: new ZdtMap<Set<string>>(),
      timezone: {
        value: timezone,
        offset: durations.ZERO,
        label: timezone,
        gmtString: timezone === UTC ? "GMT" : timezone,
      },
      showBestTimes: false,
      hideIfNeeded: false,
      showEventOptions: false,
      guestAddedAvailability: false,
      addingAvailabilityAsGuest: false,
    },
    global: {
      stubs: {
        "v-avatar": true,
        "v-btn": true,
        "v-card": true,
        "v-card-actions": true,
        "v-card-text": true,
        "v-card-title": true,
        "v-dialog": true,
        "v-icon": true,
        "v-list": true,
        "v-list-item": true,
        "v-list-item-title": true,
        "v-menu": true,
        "v-select": true,
        "v-simple-checkbox": true,
        "v-spacer": true,
        "v-switch": true,
        UserAvatarContent: true,
        EventOptions: true,
        OverflowGradient: true,
      },
    },
  })

describe("RespondentsList", () => {
  it("treats equal ZonedDateTime values as matching respondent if-needed slots", () => {
    const matchingDate = zdt("2026-01-01T09:00:00Z")
    const setEntry = zdt("2026-01-01T09:00:00Z")

    const wrapper = mountRespondentsList({
      curDate: matchingDate,
      setEntry,
    })

    expect(wrapper.text()).toContain("Ada Lovelace*")
    expect(wrapper.text()).toContain("* if needed")
  })

  it("matches stored UTC if-needed slots against rendered local-time slots", () => {
    const storedUtcSlot = zdt("2026-01-01T09:00:00Z")
    const renderedLocalSlot = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "America/Los_Angeles"
    )

    const wrapper = mountRespondentsList({
      curDate: renderedLocalSlot,
      setEntry: storedUtcSlot,
      timezone: "America/Los_Angeles",
    })

    expect(wrapper.text()).toContain("Ada Lovelace*")
    expect(wrapper.text()).toContain("* if needed")
  })
})
