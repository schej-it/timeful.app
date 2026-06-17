import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"
import { durations, eventTypes } from "@/constants"
import { ZdtSet } from "@/utils"
import { useAvailabilityData } from "./useAvailabilityData"
import { states, type FetchedResponse, type ScheduleOverlapResponse } from "./types"

const {
  authUserState,
  postMock,
  captureMock,
  showErrorMock,
  setGuestNameMock,
  setGuestOwnershipMock,
  selectGuestOwnershipMock,
  removeGuestOwnershipMock,
  getOwnedGuestOwnershipMock,
  refreshEventMock,
} = vi.hoisted(() => ({
  authUserState: { value: null as null | { _id: string } },
  postMock: vi.fn(),
  captureMock: vi.fn(),
  showErrorMock: vi.fn(),
  setGuestNameMock: vi.fn(),
  setGuestOwnershipMock: vi.fn(),
  selectGuestOwnershipMock: vi.fn(),
  removeGuestOwnershipMock: vi.fn(),
  getOwnedGuestOwnershipMock: vi.fn(),
  refreshEventMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")
  return {
    ...actual,
    post: postMock,
  }
})

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: authUserState.value,
    showError: showErrorMock,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

const day = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
  "UTC"
)

function makeAvailabilityData(options?: {
  addingAvailabilityAsGuest?: boolean
  authUserId?: string
  eventType?: string
  state?: string
  fetchedResponses?: Record<string, FetchedResponse | undefined>
  eventResponses?: Record<string, ScheduleOverlapResponse>
  getAvailabilityFromCalendarEvents?: () => ZdtSet
}) {
  authUserState.value = options?.authUserId ? { _id: options.authUserId } : null

  return useAvailabilityData({
    event: ref({
      _id: "evt-1",
      type: options?.eventType ?? eventTypes.SPECIFIC_DATES,
      dates: [day.toPlainDate()],
      timeSeed: day,
      duration: durations.ONE_HOUR,
      responses: options?.eventResponses ?? {},
    } as never),
    weekOffset: ref(0),
    state: ref((options?.state ?? states.EDIT_AVAILABILITY) as never),
    fetchedResponses: ref(options?.fetchedResponses ?? {}),
    loadingResponses: ref({
      loading: false,
      lastFetched: day,
    }),
    curGuestId: ref(""),
    addingAvailabilityAsGuest: ref(options?.addingAvailabilityAsGuest ?? false),
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
    isGroup: computed(() => (options?.eventType ?? eventTypes.SPECIFIC_DATES) === eventTypes.GROUP),
    isOwner: computed(() => false),
    guestNameKey: computed(() => "evt-1.guestName"),
    guestName: computed(() => undefined),
    guestOwnership: computed(() => undefined),
    guestResponseLookupKey: computed(() => undefined),
    ownedGuestResponses: computed(() => []),
    setGuestName: setGuestNameMock,
    setGuestOwnership: setGuestOwnershipMock,
    selectGuestOwnership: selectGuestOwnershipMock,
    removeGuestOwnership: removeGuestOwnershipMock,
    getOwnedGuestOwnership: getOwnedGuestOwnershipMock,
    getDateFromRowCol: (row: number, col: number) =>
      row === 0 && col === 0 ? day : null,
    calendarEventsByDay: computed(() => []),
    groupCalendarEventsByDay: computed(() => ({})),
    bufferTime: ref({ enabled: false, time: 0 }),
    workingHours: ref({ enabled: false, startTime: 9, endTime: 17 }),
    getAvailabilityFromCalendarEvents:
      options?.getAvailabilityFromCalendarEvents ?? (() => new ZdtSet()),
    refreshEvent: refreshEventMock,
  })
}

describe("useAvailabilityData respondent saves", () => {
  beforeEach(() => {
    authUserState.value = null
    postMock.mockReset()
    captureMock.mockReset()
    showErrorMock.mockReset()
    setGuestNameMock.mockReset()
    setGuestOwnershipMock.mockReset()
    selectGuestOwnershipMock.mockReset()
    removeGuestOwnershipMock.mockReset()
    getOwnedGuestOwnershipMock.mockReset()
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

  it("does not post for a signed-in respondent with empty availability", async () => {
    const availabilityData = makeAvailabilityData({
      authUserId: "user-1",
    })

    const submitted = await availabilityData.submitAvailability()

    expect(submitted).toBe(false)
    expect(postMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      "Select at least one time before saving."
    )
  })

  it("does not post for a guest respondent with empty availability", async () => {
    const availabilityData = makeAvailabilityData({
      addingAvailabilityAsGuest: true,
    })

    const submitted = await availabilityData.submitAvailability({
      name: "Ada",
      email: "ada@example.com",
    })

    expect(submitted).toBe(false)
    expect(postMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      "Select at least one time before saving."
    )
  })

  it("does not post for a group respondent with empty effective availability", async () => {
    const availabilityData = makeAvailabilityData({
      authUserId: "user-1",
      eventType: eventTypes.GROUP,
      getAvailabilityFromCalendarEvents: () => new ZdtSet(),
    })

    const submitted = await availabilityData.submitAvailability()

    expect(submitted).toBe(false)
    expect(postMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      "Select at least one time before saving."
    )
  })

  it("posts successfully when respondent availability is non-empty", async () => {
    const availabilityData = makeAvailabilityData({
      addingAvailabilityAsGuest: true,
    })
    availabilityData.availability.value = new ZdtSet([day])

    const submitted = await availabilityData.submitAvailability({
      name: "Ada",
      email: "ada@example.com",
    })

    expect(submitted).toBe(true)
    expect(setGuestOwnershipMock).toHaveBeenCalledWith({
      name: "Ada",
      guestId: "guest-token-id",
      guestEditToken: "secret-token",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    expect(setGuestNameMock).not.toHaveBeenCalled()
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

  it("removes overlap from if-needed slots before posting respondent availability", async () => {
    const availabilityData = makeAvailabilityData({
      addingAvailabilityAsGuest: true,
    })
    availabilityData.availability.value = new ZdtSet([day])
    availabilityData.ifNeeded.value = new ZdtSet([day])

    const submitted = await availabilityData.submitAvailability({
      name: "Ada",
      email: "ada@example.com",
    })

    expect(submitted).toBe(true)
    expect(postMock).toHaveBeenCalledWith(
      "/events/evt-1/response",
      expect.objectContaining({
        availability: ["2026-01-01T09:00:00Z"],
        ifNeeded: [],
      })
    )
  })

  it("normalizes fetched overlap so hover state and edit mode both treat the shared slot as available", async () => {
    const availabilityData = makeAvailabilityData({
      state: states.SINGLE_AVAILABILITY,
      eventResponses: {
        "user-1": {
          user: { _id: "user-1" },
          availability: [],
          ifNeeded: [],
        },
      },
      fetchedResponses: {
        "user-1": {
          availability: [day],
          ifNeeded: [day],
        },
      },
    })

    availabilityData.getResponsesFormatted()
    availabilityData.showAvailability(0, 0)

    expect(availabilityData.curTimeslotAvailability.value["user-1"]).toBe(true)
    expect(availabilityData.parsedResponses.value["user-1"].availability.size).toBe(1)
    expect(availabilityData.parsedResponses.value["user-1"].ifNeeded?.size).toBe(0)

    availabilityData.populateUserAvailability("user-1")
    await Promise.resolve()

    expect(availabilityData.availability.value.size).toBe(1)
    expect(availabilityData.ifNeeded.value.size).toBe(0)
  })
})
