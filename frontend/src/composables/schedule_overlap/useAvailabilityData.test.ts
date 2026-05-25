import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"
import { durations, eventTypes } from "@/constants"
import { ZdtSet } from "@/utils"
import { useAvailabilityData } from "./useAvailabilityData"
import { states } from "./types"

const {
  postMock,
  captureMock,
  setGuestNameMock,
  setGuestOwnershipMock,
  clearStoredGuestOwnershipMock,
  refreshEventMock,
} = vi.hoisted(
  () => ({
    postMock: vi.fn(),
    captureMock: vi.fn(),
    setGuestNameMock: vi.fn(),
    setGuestOwnershipMock: vi.fn(),
    clearStoredGuestOwnershipMock: vi.fn(),
    refreshEventMock: vi.fn(),
  })
)

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")
  return {
    ...actual,
    post: postMock,
  }
})

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

describe("useAvailabilityData guest persistence", () => {
  beforeEach(() => {
    postMock.mockReset()
    captureMock.mockReset()
    setGuestNameMock.mockReset()
    setGuestOwnershipMock.mockReset()
    clearStoredGuestOwnershipMock.mockReset()
    refreshEventMock.mockReset()
    postMock.mockResolvedValue({
      guestCredentials: {
        guestId: "guest-token-id",
        guestEditToken: "secret-token",
        guestEditPolicy: "protected",
        guestOwnershipMode: "token",
      },
    })
  })

  it("routes guest saves through the shared guest-name setter", async () => {
    const day = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "UTC"
    )
    const availabilityData = useAvailabilityData({
      event: ref({
        _id: "evt-1",
        type: eventTypes.SPECIFIC_DATES,
        dates: [day.toPlainDate()],
        timeSeed: day,
        duration: durations.ONE_HOUR,
        responses: {},
      } as never),
      weekOffset: ref(0),
      state: ref(states.EDIT_AVAILABILITY),
      fetchedResponses: ref({}),
      loadingResponses: ref({
        loading: false,
        lastFetched: day,
      }),
      curGuestId: ref(""),
      addingAvailabilityAsGuest: ref(true),
      showSnackbar: ref(false),
      calendarPermissionGranted: ref(false),
      loadingCalendarEvents: ref(false),
      allDays: computed(() => [
        {
          dayText: "thu",
          dateString: "jan 1",
          dateObject: day,
          isConsecutive: true,
        },
      ]),
      days: computed(() => [
        {
          dayText: "thu",
          dateString: "jan 1",
          dateObject: day,
          isConsecutive: true,
        },
      ]),
      times: computed(() => [{ hoursOffset: durations.ZERO, text: "9 AM" }]),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "9 AM" }], []]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      page: ref(0),
      maxDaysPerPage: computed(() => 7),
      isGroup: computed(() => false),
      isOwner: computed(() => false),
      guestNameKey: computed(() => "evt-1.guestName"),
      guestName: computed(() => undefined),
      guestOwnership: computed(() => undefined),
      guestResponseLookupKey: computed(() => undefined),
      setGuestName: setGuestNameMock,
      setGuestOwnership: setGuestOwnershipMock,
      clearStoredGuestOwnership: clearStoredGuestOwnershipMock,
      getDateFromRowCol: (row: number, col: number) => (row === 0 && col === 0 ? day : null),
      calendarEventsByDay: computed(() => []),
      groupCalendarEventsByDay: computed(() => ({})),
      bufferTime: ref({ enabled: false, time: 0 }),
      workingHours: ref({ enabled: false, startTime: 9, endTime: 17 }),
      getAvailabilityFromCalendarEvents: () => new ZdtSet(),
      refreshEvent: refreshEventMock,
    })

    availabilityData.availability.value = new ZdtSet([day])

    await availabilityData.submitAvailability({
      name: "Ada",
      email: "ada@example.com",
    })

    expect(setGuestNameMock).toHaveBeenCalledWith("Ada")
    expect(setGuestOwnershipMock).toHaveBeenCalledWith({
      name: "Ada",
      guestId: "guest-token-id",
      guestEditToken: "secret-token",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    expect(postMock).toHaveBeenCalledWith(
      "/events/evt-1/response",
      expect.objectContaining({
        guest: true,
        name: "Ada",
        email: "ada@example.com",
      })
    )
    expect(refreshEventMock).toHaveBeenCalledTimes(1)
  })
})
