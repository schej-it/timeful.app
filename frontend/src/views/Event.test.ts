// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { computed, nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, guestUserId } from "@/constants"
import { Temporal } from "temporal-polyfill"
import EventView from "./Event.vue"
import eventViewSource from "./Event.vue?raw"

interface EventTestResponse {
  name: string
  user: {
    _id?: string
    firstName: string
    lastName: string
    email: string
  }
  availability: unknown[]
  guestId?: string
  guestOwnershipMode?: "legacy" | "token"
}

interface EventTestState {
  _id: string
  shortId: string
  ownerId: string
  name: string
  type: string
  daysOnly?: boolean
  dates?: Temporal.PlainDate[]
  responses: Record<string, EventTestResponse>
  blindAvailabilityEnabled: boolean
  hasSpecificTimes?: boolean
  times?: Temporal.ZonedDateTime[]
  enabledSlots?: Temporal.ZonedDateTime[]
  activeSlots?: Temporal.ZonedDateTime[]
  eventTimezone?: string
  slotGeneration?: {
    startTimeLocal: Temporal.PlainTime
    endTimeLocal: Temporal.PlainTime
    timeIncrement: Temporal.Duration
  }
  timedRecurrence?: {
    kind: "specific_dates" | "weekly"
    selectedDays: Temporal.PlainDate[]
    selectedDaysOfWeek: number[]
    startOnMonday: boolean
  }
}

function createDefaultEventState(): EventTestState {
  const state: EventTestState = {
    _id: "evt-1",
    shortId: "dEeaF",
    ownerId: "owner-1",
    name: "dfg",
    type: "specific_dates",
    responses: {
      khh: {
        name: "khh",
        user: {
          _id: "000000000000000000000000",
          firstName: "khh",
          lastName: "",
          email: "",
        },
        availability: [],
      },
    },
    blindAvailabilityEnabled: false,
  }

  return state
}

const {
  editGuestAvailabilityMock,
  editOwnedGuestAvailabilityMock,
  authUserState,
  isPhoneState,
  curGuestIdState,
  routeState,
  loaderEventState,
  refreshEventMock,
  checkOwnerPremiumMock,
  fetchCalendarAvailabilitiesMock,
  fetchAuthUserCalendarEventsMock,
  routerPushMock,
  routerReplaceMock,
  showErrorMock,
  addAvailabilityAsGuestMock,
  copyLinkMock,
  editEventMock,
} = vi.hoisted(() => ({
  editGuestAvailabilityMock: vi.fn(),
  editOwnedGuestAvailabilityMock: vi.fn(),
  authUserState: { value: null as null | { _id: string } },
  isPhoneState: { value: false },
  curGuestIdState: { value: "" },
  routeState: { value: { name: "event", query: {} } },
  refreshEventMock: vi.fn().mockResolvedValue(undefined),
  checkOwnerPremiumMock: vi.fn().mockResolvedValue(undefined),
  fetchCalendarAvailabilitiesMock: vi.fn().mockResolvedValue(undefined),
  fetchAuthUserCalendarEventsMock: vi.fn().mockResolvedValue(undefined),
  loaderEventState: {
    value: createDefaultEventState(),
  },
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  showErrorMock: vi.fn(),
  addAvailabilityAsGuestMock: vi.fn(),
  copyLinkMock: vi.fn(),
  editEventMock: vi.fn(),
}))

const scheduleOverlapMethodMocks: Record<string, ReturnType<typeof vi.fn>> = {
  scheduleEvent: vi.fn(),
  cancelScheduleEvent: vi.fn(),
  confirmScheduleEvent: vi.fn(),
  editOwnedGuestAvailability: editOwnedGuestAvailabilityMock,
}

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
  useRoute: () => routeState.value,
}))

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    authUser: computed(() => authUserState.value),
    viewerHasPremiumAccess: ref(false),
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showInfo: vi.fn(),
    showError: showErrorMock,
    setAuthUser: vi.fn(),
  }),
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: computed(() => isPhoneState.value),
  }),
}))

vi.mock("@/composables/event/useEventLoader", () => ({
  useEventLoader: () => ({
    event: computed(() => loaderEventState.value),
    loading: ref(false),
    ownerIsPremium: ref(false),
    calendarEventsMap: ref({}),
    calendarAvailabilities: ref({}),
    calendarPermissionGranted: ref(false),
    fromEditEvent: ref(false),
    ownerPremiumChecked: ref(true),
    refreshEvent: refreshEventMock,
    refreshCalendar: vi.fn().mockResolvedValue(undefined),
    fetchCalendarAvailabilities: fetchCalendarAvailabilitiesMock,
    fetchAuthUserCalendarEvents: fetchAuthUserCalendarEventsMock,
    checkOwnerPremium: checkOwnerPremiumMock,
  }),
}))

vi.mock("@/composables/event/useEventRespondent", () => ({
  useEventRespondent: () => ({
    curGuestId: ref(curGuestIdState.value),
    addingAvailabilityAsGuest: ref(false),
    currSignUpBlock: ref(null),
    signUpForSlotDialog: ref(false),
    initiateSignUpFlow: vi.fn(),
    signUpForBlock: vi.fn(),
  }),
}))

vi.mock("@/composables/event/useEventEditing", () => ({
  useEventEditing: () => ({
    editEventDialog: ref(false),
    choiceDialog: ref(false),
    webviewDialog: ref(false),
    guestDialog: ref(false),
    pagesNotVisitedDialog: ref(false),
    availabilityBtnOpacity: ref(1),
    availabilityBtnAttentionActive: ref(false),
    addAvailability: vi.fn(),
    addAvailabilityAsGuest: addAvailabilityAsGuestMock,
    cancelEditing: vi.fn(),
    copyLink: copyLinkMock,
    deleteAvailability: vi.fn(),
    editEvent: editEventMock,
    saveChanges: vi.fn(),
    saveChangesAsGuest: vi.fn(),
    setAvailabilityAutomatically: vi.fn(),
    setAvailabilityManually: vi.fn(),
    editGuestAvailability: editGuestAvailabilityMock,
    signInLinkApple: vi.fn(),
    addedAppleCalendar: vi.fn(),
    addedICSCalendar: vi.fn(),
    highlightAvailabilityBtn: vi.fn(),
    handleGuestDialogSubmit: vi.fn(),
  }),
}))

vi.mock("@/utils/services/UserService", () => ({
  fetchAuthUserProfile: vi.fn().mockResolvedValue(null),
}))

const ScheduleOverlapStub = {
  name: "ScheduleOverlap",
  props: {
    event: {
      type: Object,
      required: false,
      default: null,
    },
    fromCreateSpecificTimesDraft: {
      type: Boolean,
      required: false,
      default: false,
    },
    specificTimesEntryDraft: {
      type: Object,
      required: false,
      default: undefined,
    },
  },
  data() {
    return {
      ownedGuestResponses: [
        {
          lookupKey: "000000000000000000000000",
          name: "khh",
          lastUsedAt: 1,
        },
      ],
      respondents: [{ _id: "khh", name: "khh" }],
      editing: false,
      scheduling: false,
      allowScheduleEvent: false,
      unsavedChanges: false,
      showBestTimes: true,
      hideIfNeeded: false,
      showAllHours: false,
      showCalendarEvents: false,
      startCalendarOnMonday: false,
      states: {
        SET_SPECIFIC_TIMES: "set_specific_times",
      },
      state: "heatmap",
    }
  },
  methods: {
    scheduleEvent: scheduleOverlapMethodMocks.scheduleEvent,
    cancelScheduleEvent: scheduleOverlapMethodMocks.cancelScheduleEvent,
    confirmScheduleEvent: scheduleOverlapMethodMocks.confirmScheduleEvent,
    editOwnedGuestAvailability: scheduleOverlapMethodMocks.editOwnedGuestAvailability,
    updateShowBestTimes(this: Record<string, boolean>, value: boolean) {
      this.showBestTimes = value
    },
    updateHideIfNeeded(this: Record<string, boolean>, value: boolean) {
      this.hideIfNeeded = value
    },
    updateShowAllHours(this: Record<string, boolean>, value: boolean) {
      this.showAllHours = value
    },
    updateShowCalendarEvents(this: Record<string, boolean>, value: boolean) {
      this.showCalendarEvents = value
    },
    updateStartCalendarOnMonday(this: Record<string, boolean>, value: boolean) {
      this.startCalendarOnMonday = value
    },
    getAllValidTimeRanges() {
      return []
    },
  },
  template: "<div />",
}

const ScheduleOverlapNoGuestSelectionStub = {
  ...ScheduleOverlapStub,
  data() {
    return {
      ...ScheduleOverlapStub.data(),
      ownedGuestResponses: [
        {
          lookupKey: "000000000000000000000000",
          name: "khh",
          lastUsedAt: 2,
        },
        {
          lookupKey: "111111111111111111111111",
          name: "ada",
          lastUsedAt: 1,
        },
      ],
      respondents: [
        { _id: "khh", name: "khh" },
        { _id: "ada", name: "ada" },
      ],
    }
  },
}

const ScheduleOverlapNoOwnedGuestResponsesStub = {
  ...ScheduleOverlapStub,
  data() {
    return {
      ...ScheduleOverlapStub.data(),
      ownedGuestResponses: [],
      respondents: [],
    }
  },
}

const ScheduleOverlapEditingStub = {
  ...ScheduleOverlapStub,
  data() {
    return {
      ...ScheduleOverlapStub.data(),
      editing: true,
    }
  },
}

const ScheduleOverlapLegacyAndTokenGuestSelectionStub = {
  ...ScheduleOverlapStub,
  data() {
    return {
      ...ScheduleOverlapStub.data(),
      ownedGuestResponses: [
        {
          lookupKey: "legacy-user-id",
          name: "Saved legacy guest",
          lastUsedAt: 2,
        },
        {
          lookupKey: "guest-token-id",
          name: "Saved token guest",
          lastUsedAt: 1,
        },
      ],
      respondents: [
        { _id: "legacy-response", name: "Legacy Display Name" },
        { _id: "token-response", name: "Token Display Name" },
      ],
    }
  },
}

const eventDescriptionCanEditStub = {
  name: "EventDescriptionStub",
  props: {
    canEdit: { type: Boolean, required: true },
  },
  template: "<div id=\"event-description-stub\" :data-can-edit=\"String(canEdit)\" />",
}

const invitationDialogStub = {
  name: "InvitationDialogStub",
  props: {
    modelValue: { type: Boolean, required: true },
  },
  template: "<div :data-invitation-open=\"String(modelValue)\" />",
}

const buttonClickStub = {
  template: "<button @click=\"$emit('click', $event)\"><slot /></button>",
}

const buttonSemanticStub = {
  inheritAttrs: false,
  emits: ["click"],
  props: {
    id: { type: String, default: "" },
    variant: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  template: `
    <button
      v-bind="$attrs"
      :id="id"
      :data-variant="variant"
      :data-color="color"
      @click="$emit('click', $event)"
    >
      <slot />
    </button>
  `,
}

const menuStub = {
  name: "VMenu",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div v-if="modelValue"><slot /></div>',
}

const iconTextStub = {
  template: "<i><slot /></i>",
}

describe("Event guest edit action", () => {
  it("switches the compact desktop header to the standard sm breakpoint", () => {
    expect(eventViewSource).toContain("sm:tw-flex-row sm:tw-items-start sm:tw-gap-4")
    expect(eventViewSource).not.toContain(
      "md:tw-flex-row md:tw-items-start md:tw-gap-4"
    )
  })

  it("keeps the metadata actions stacked until the md breakpoint", () => {
    expect(eventViewSource).toContain(
      "tw-flex tw-flex-col tw-gap-2 md:tw-flex-row md:tw-flex-wrap md:tw-items-center md:tw-gap-x-3 md:tw-gap-y-2"
    )
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => {
        callback(0)
      }, 0)
    )
    authUserState.value = null
    isPhoneState.value = false
    curGuestIdState.value = ""
    routeState.value = { name: "event", query: {} }
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.SPECIFIC_DATES,
    }
  })

  async function flushDeferredMount() {
    await nextTick()
    vi.runAllTimers()
    await Promise.resolve()
    vi.runAllTimers()
    await nextTick()
    await nextTick()
  }

  it("renders a durable inline not-found state for missing event fetches", async () => {
    loaderEventState.value = null as unknown as EventTestState
    refreshEventMock.mockRejectedValueOnce({
      status: 404,
      parsed: { error: "event-not-found" },
    })

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()
    await Promise.resolve()
    await nextTick()

    expect(wrapper.text()).toContain("Event not found")
    expect(wrapper.text()).toContain(
      "This event may have been deleted, or the link may be incorrect."
    )
    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(showErrorMock).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ScheduleOverlapStub).exists()).toBe(false)
  })

  it("shows generic edit copy when one owned guest response exists", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")
  })

  it("applies a create-flow specific-times draft from history state before rendering the calendar", async () => {
    window.history.replaceState(
      {
        timefulSpecificTimesEntry: {
          mode: "create",
          draft: {
            enabledSlots: ["2026-05-28T09:00:00Z"],
            activeSlots: [],
            eventTimezone: "UTC",
            slotGeneration: {
              startTimeLocal: "09:00:00",
              endTimeLocal: "10:00:00",
              timeIncrementMinutes: 60,
            },
            timedRecurrence: {
              kind: "specific_dates",
              selectedDays: ["2026-05-28"],
              selectedDaysOfWeek: [],
              startOnMonday: true,
            },
            timeIncrementMinutes: 60,
            resetExistingTimes: true,
          },
        },
      },
      "",
      "http://localhost:3000/e/dEeaF"
    )
    loaderEventState.value = {
      ...createDefaultEventState(),
      hasSpecificTimes: true,
      times: [
        Temporal.Instant.from("2026-05-28T09:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      enabledSlots: [
        Temporal.Instant.from("2026-05-28T09:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      activeSlots: [
        Temporal.Instant.from("2026-05-28T09:00:00Z").toZonedDateTimeISO("UTC"),
      ],
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()
    await Promise.resolve()
    await nextTick()

    const scheduleOverlap = wrapper.findComponent(ScheduleOverlapStub)
    expect(scheduleOverlap.exists()).toBe(true)
    expect(scheduleOverlap.props("fromCreateSpecificTimesDraft")).toBe(true)
    expect(
      (
        scheduleOverlap.props("specificTimesEntryDraft") as {
          activeSlots?: unknown[]
          resetExistingTimes?: boolean
        }
      ).activeSlots
    ).toEqual([])
    expect(
      (window.history.state as { timefulSpecificTimesEntry?: unknown })
        .timefulSpecificTimesEntry
    ).toBeUndefined()

    wrapper.unmount()
  })

  it("keeps the top button label generic when multiple owned guest responses exist", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        khh: {
          name: "khh",
          user: {
            _id: "000000000000000000000000",
            firstName: "khh",
            lastName: "",
            email: "",
          },
          availability: [],
        },
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#desktop-primary-availability-btn").text()).toContain(
      "Edit availability"
    )
    expect(wrapper.get("#desktop-primary-availability-btn").classes()).toContain(
      "desktop-primary-availability-button--edit"
    )
    expect(wrapper.get("#desktop-secondary-availability-btn").text()).toContain(
      "Add availability"
    )
  })

  it("shows add-guest availability beside edit availability for signed-in respondents", async () => {
    authUserState.value = {
      _id: "000000000000000000000000",
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#desktop-primary-availability-btn").text()).toContain(
      "Edit availability"
    )
    expect(wrapper.get("#desktop-primary-availability-btn").classes()).toContain(
      "desktop-primary-availability-button--edit"
    )
    expect(wrapper.get("#desktop-secondary-availability-btn").text()).toContain(
      "Add guest availability"
    )
  })

  it("renders desktop display options in the header action cluster", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        ...loaderEventState.value.responses,
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          EventOptions: true,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-btn": buttonSemanticStub,
          "v-card": true,
          "v-card-actions": true,
          "v-card-text": true,
          "v-card-title": true,
          "v-chip": true,
          "v-dialog": true,
          "v-icon": true,
          "v-spacer": true,
        },
      },
    })

    await flushDeferredMount()
    await nextTick()
    await nextTick()

    expect(wrapper.get("#event-header-actions").classes()).toContain(
      "desktop-event-header-actions"
    )
    expect(wrapper.get("#desktop-primary-availability-btn").classes()).toContain(
      "desktop-event-header-control"
    )
    expect(
      wrapper.get("#desktop-secondary-availability-btn").classes()
    ).toContain("desktop-event-header-control")
    expect(wrapper.find("#show-best-times-header-toggle").exists()).toBe(true)
    expect(wrapper.find("#desktop-header-more-options").exists()).toBe(true)
    expect(wrapper.find("#show-all-hours-toggle").exists()).toBe(false)
  })

  it("uses the add-specific desktop CTA styling when the primary action is Add availability", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {},
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoOwnedGuestResponsesStub,
          EventOptions: true,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-btn": buttonSemanticStub,
          "v-card": true,
          "v-card-actions": true,
          "v-card-text": true,
          "v-card-title": true,
          "v-chip": true,
          "v-dialog": true,
          "v-icon": true,
          "v-spacer": true,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#desktop-primary-availability-btn").text()).toContain(
      "Add availability"
    )
    expect(wrapper.get("#desktop-primary-availability-btn").classes()).toContain(
      "desktop-primary-availability-button--add"
    )
  })

  it("triggers add guest availability from the new secondary desktop action", async () => {
    authUserState.value = {
      _id: "000000000000000000000000",
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()
    const initialCallCount = addAvailabilityAsGuestMock.mock.calls.length
    await wrapper.get("#desktop-secondary-availability-btn").trigger("click")

    expect(addAvailabilityAsGuestMock).toHaveBeenCalledTimes(initialCallCount + 1)
  })

  it("opens direct guest editing when exactly one owned guest response exists", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    const guestEditButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Edit availability"))

    expect(guestEditButton).toBeDefined()
    if (!guestEditButton) {
      throw new Error("Expected guest edit button to be rendered")
    }

    await guestEditButton.trigger("click")

    expect(editOwnedGuestAvailabilityMock).toHaveBeenCalledWith(
      "000000000000000000000000"
    )
  })

  it("uses generic edit copy for blind availability when a guest target is selected", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      blindAvailabilityEnabled: true,
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")
  })

  it("does not jump straight into editing when multiple guest responses exist", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        khh: {
          name: "khh",
          user: {
            _id: "000000000000000000000000",
            firstName: "khh",
            lastName: "",
            email: "",
          },
          availability: [],
        },
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    const guestEditButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Edit availability"))

    expect(guestEditButton).toBeDefined()
    if (!guestEditButton) {
      throw new Error("Expected guest edit button to be rendered")
    }

    await guestEditButton.trigger("click")
    await nextTick()

    expect(editOwnedGuestAvailabilityMock).not.toHaveBeenCalled()
  })

  it("renders the desktop owned guest chooser from the primary availability anchor", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        khh: {
          name: "khh",
          user: {
            _id: "000000000000000000000000",
            firstName: "khh",
            lastName: "",
            email: "",
          },
          availability: [],
        },
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()
    await wrapper.get("#desktop-primary-availability-btn").trigger("click")
    await nextTick()

    expect(
      (wrapper.vm as unknown as { showGuestEditMenu: boolean }).showGuestEditMenu
    ).toBe(true)

    const primaryAnchor = wrapper.get(".desktop-primary-availability-anchor")
    expect(primaryAnchor.find("#desktop-primary-availability-btn").exists()).toBe(
      true
    )
    expect(primaryAnchor.findComponent({ name: "VMenu" }).exists()).toBe(true)

    const headerActionButtons = Array.from(
      wrapper.get("#event-header-actions").element.children
    )
      .filter((child) => child.tagName === "BUTTON")
      .map((child) => child.textContent.trim())
    expect(headerActionButtons).not.toContain("khh")
    expect(headerActionButtons).not.toContain("ada")
  })

  it("renders the mobile owned guest chooser from the sticky primary availability action", async () => {
    isPhoneState.value = true
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        khh: {
          name: "khh",
          user: {
            _id: "000000000000000000000000",
            firstName: "khh",
            lastName: "",
            email: "",
          },
          availability: [],
        },
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()
    await wrapper.get("#mobile-primary-availability-btn").trigger("click")
    await nextTick()

    expect(
      (wrapper.vm as unknown as { showGuestEditMenu: boolean }).showGuestEditMenu
    ).toBe(true)
    expect(wrapper.get("#mobile-primary-availability-btn").text()).toContain(
      "Edit availability"
    )
    expect(wrapper.get("#mobile-primary-availability-btn").classes()).toContain(
      "mobile-primary-availability-button--edit"
    )
    expect(wrapper.findComponent({ name: "VMenu" }).exists()).toBe(true)
  })

  it("closes the owned guest edit menu when clicking outside it", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        khh: {
          name: "khh",
          user: {
            _id: "000000000000000000000000",
            firstName: "khh",
            lastName: "",
            email: "",
          },
          availability: [],
        },
        ada: {
          name: "ada",
          user: {
            _id: "111111111111111111111111",
            firstName: "ada",
            lastName: "",
            email: "",
          },
          availability: [],
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapNoGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    ;(
      wrapper.vm as unknown as { editSelectedGuestAvailability: () => void }
    ).editSelectedGuestAvailability()
    await nextTick()

    expect(
      (wrapper.vm as unknown as { showGuestEditMenu: boolean }).showGuestEditMenu
    ).toBe(true)

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await nextTick()

    expect(
      (wrapper.vm as unknown as { showGuestEditMenu: boolean }).showGuestEditMenu
    ).toBe(false)
    expect(editOwnedGuestAvailabilityMock).not.toHaveBeenCalled()
  })

  it("matches legacy owned guest menu options by canonical stored identity instead of response name", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        "legacy-user-id": {
          name: "Legacy Display Name",
          user: {
            firstName: "legacy",
            lastName: "",
            email: "",
          },
          availability: [],
          guestOwnershipMode: "legacy",
        },
        tokenResponse: {
          name: "Token Display Name",
          user: {
            _id: "unrelated-user-id",
            firstName: "token",
            lastName: "",
            email: "",
          },
          availability: [],
          guestId: "guest-token-id",
          guestOwnershipMode: "token",
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapLegacyAndTokenGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")

    ;(wrapper.vm as unknown as { editSelectedGuestAvailability: () => void })
      .editSelectedGuestAvailability()
    await nextTick()

    const vm = wrapper.vm as unknown as {
      ownedGuestEditOptions: { lookupKey: string; name: string }[]
      editOwnedGuestAvailability: (lookupKey: string) => void
    }
    const legacyOption = vm.ownedGuestEditOptions.find(
      (option) => option.lookupKey === "legacy-user-id"
    )
    expect(legacyOption).toMatchObject({
      lookupKey: "legacy-user-id",
      name: "legacy",
    })

    vm.editOwnedGuestAvailability("legacy-user-id")
    await nextTick()

    expect(editOwnedGuestAvailabilityMock).toHaveBeenCalledWith("legacy-user-id")
  })

  it("matches token-owned guest menu options by guest id", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      responses: {
        legacyResponse: {
          name: "Legacy Display Name",
          user: {
            _id: "legacy-user-id",
            firstName: "legacy",
            lastName: "",
            email: "",
          },
          availability: [],
          guestOwnershipMode: "legacy",
        },
        tokenResponse: {
          name: "Token Display Name",
          user: {
            _id: "unrelated-user-id",
            firstName: "token",
            lastName: "",
            email: "",
          },
          availability: [],
          guestId: "guest-token-id",
          guestOwnershipMode: "token",
        },
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapLegacyAndTokenGuestSelectionStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-menu": menuStub,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")

    ;(wrapper.vm as unknown as { editSelectedGuestAvailability: () => void })
      .editSelectedGuestAvailability()
    await nextTick()

    const vm = wrapper.vm as unknown as {
      ownedGuestEditOptions: { lookupKey: string; name: string }[]
      editOwnedGuestAvailability: (lookupKey: string) => void
    }
    const tokenEntry = vm.ownedGuestEditOptions.find(
      (option) => option.lookupKey === "guest-token-id"
    )
    if (tokenEntry == null) {
      throw new Error("Expected token guest menu option metadata to be available")
    }
    expect(tokenEntry.name).toContain("token")

    vm.editOwnedGuestAvailability("guest-token-id")
    await nextTick()

    expect(editOwnedGuestAvailabilityMock).toHaveBeenCalledWith("guest-token-id")
  })

  it("passes loaded event responses through to the schedule-overlap boundary", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()

    const scheduleOverlapEvent = wrapper.findComponent(ScheduleOverlapStub).props("event") as {
      responses?: Record<string, { user?: { firstName?: string } }>
    }

    expect(scheduleOverlapEvent.responses).toMatchObject({
      khh: {
        user: {
          firstName: "khh",
        },
      },
    })
  })

  it("renders the owner edit button as an outlined metadata action", async () => {
    authUserState.value = { _id: "owner-1" }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const ownerEditButton = wrapper.get("#edit-event-btn")
    expect(ownerEditButton.text()).toContain("Edit event")
    expect(ownerEditButton.attributes("data-variant")).toBe("outlined")
    expect(ownerEditButton.attributes("data-color")).toBe("primary")
  })

  it("renders copy link in the metadata action cluster with outlined secondary styling", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const metaRow = wrapper.get("#event-header-meta-row")
    const buttonRow = wrapper.get("#event-header-button-row")
    const copyLinkButton = wrapper.get("#copy-link-btn")

    expect(metaRow.text()).toContain("Copy link")
    expect(buttonRow.text()).toContain("Copy link")
    expect(copyLinkButton.attributes("data-variant")).toBe("outlined")
    expect(copyLinkButton.attributes("data-color")).toBe("primary")
    expect(copyLinkButton.text()).toContain("mdi-content-copy")
    expect(copyLinkButton.text()).toContain("Copy link")
  })

  it("hides the header date summary for timed specific-date events", async () => {
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.SPECIFIC_DATES,
      daysOnly: false,
      dates: [Temporal.PlainDate.from("2026-05-28")],
      hasSpecificTimes: true,
      enabledSlots: [
        Temporal.Instant.from("2026-05-28T00:00:00Z").toZonedDateTimeISO("UTC"),
        Temporal.Instant.from("2026-05-29T00:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      activeSlots: [
        Temporal.Instant.from("2026-05-29T00:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("00:00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 60 }),
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: [Temporal.PlainDate.from("2026-05-28")],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#event-header-meta-row").text()).not.toContain(
      "5/28 - 5/29"
    )
  })

  it("keeps timed specific-date header summaries hidden in viewer timezones too", async () => {
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.SPECIFIC_DATES,
      daysOnly: false,
      dates: [Temporal.PlainDate.from("2026-05-28")],
      hasSpecificTimes: true,
      enabledSlots: [
        Temporal.Instant.from("2026-05-28T00:00:00Z").toZonedDateTimeISO("UTC"),
        Temporal.Instant.from("2026-05-29T00:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      activeSlots: [
        Temporal.Instant.from("2026-05-29T00:00:00Z").toZonedDateTimeISO("UTC"),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("00:00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 60 }),
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: [Temporal.PlainDate.from("2026-05-28")],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
        initialTimezone: {
          value: "America/Los_Angeles",
          offset: Temporal.Duration.from({ hours: 7 }),
          label: "America/Los_Angeles",
          gmtString: "GMT-7",
        },
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#event-header-meta-row").text()).not.toContain(
      "5/27 - 5/28"
    )
  })

  it("keeps the header date summary for days-only specific-date events", async () => {
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.SPECIFIC_DATES,
      daysOnly: true,
      dates: [
        Temporal.PlainDate.from("2026-05-28"),
        Temporal.PlainDate.from("2026-05-29"),
      ],
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#event-header-meta-row").text()).toContain("5/28 - 5/29")
  })

  it("invokes copy link from the metadata action row", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    await wrapper.get("#copy-link-btn").trigger("click")

    expect(copyLinkMock).toHaveBeenCalled()
  })

  it("keeps the metadata action cluster inside the metadata row before the description", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: eventDescriptionCanEditStub,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const rendered = wrapper.html()

    expect(rendered.indexOf("event-header-meta-row")).toBeGreaterThan(-1)
    expect(rendered.indexOf("event-header-button-row")).toBeGreaterThan(
      rendered.indexOf("event-header-meta-row")
    )
    expect(rendered.indexOf("event-description-stub")).toBeGreaterThan(
      rendered.indexOf("event-header-meta-row")
    )
  })

  it("keeps copy link explicit on phones instead of switching to a share icon", async () => {
    isPhoneState.value = true

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const copyLinkButton = wrapper.get("#copy-link-btn")
    expect(copyLinkButton.text()).toContain("Copy link")
    expect(copyLinkButton.text()).toContain("mdi-content-copy")
    expect(copyLinkButton.text()).not.toContain("mdi-share")
  })

  it("moves mobile add availability into the sticky footer action cluster", async () => {
    isPhoneState.value = true

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#mobile-primary-availability-btn").text()).toContain(
      "Edit availability"
    )
    expect(wrapper.get("#mobile-primary-availability-btn").classes()).toContain(
      "mobile-primary-availability-button--edit"
    )
    expect(wrapper.get("#mobile-secondary-availability-btn").text()).toContain(
      "Add availability"
    )
    expect(wrapper.text()).not.toContain("+ Add availability")
  })

  it("uses a compact add-guest label in the mobile footer for signed-in respondents", async () => {
    isPhoneState.value = true
    authUserState.value = {
      _id: "000000000000000000000000",
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.get("#mobile-secondary-availability-btn").text()).toContain(
      "Add guest"
    )
  })

  it("renders desktop editing actions with a flat save button", async () => {
    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapEditingStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const cancelButton = wrapper.get(".desktop-editing-cancel-button")
    const saveButton = wrapper.get(".desktop-editing-save-button")
    expect(cancelButton.text()).toContain("Cancel")
    expect(cancelButton.attributes("data-variant")).toBe("outlined")
    expect(saveButton.text()).toContain("Save")
    expect(saveButton.classes()).toContain("desktop-editing-save-button")
  })

  it("renders mobile editing actions with outlined cancel and flat save", async () => {
    isPhoneState.value = true

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapEditingStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": iconTextStub,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    const cancelButton = wrapper.get(".mobile-editing-cancel-button")
    const saveButton = wrapper.get(".mobile-editing-save-button")
    expect(cancelButton.text()).toContain("Cancel")
    expect(cancelButton.attributes("data-variant")).toBe("outlined")
    expect(saveButton.text()).toContain("Save")
    expect(saveButton.classes()).toContain("mobile-editing-save-button")
  })

  it("does not render the relocated copy link action for group events", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      type: eventTypes.GROUP,
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.find("#copy-link-btn").exists()).toBe(false)
  })

  it("keeps metadata editing available for events created while not signed in", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      ownerId: guestUserId,
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: eventDescriptionCanEditStub,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": buttonSemanticStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.find("#edit-event-btn").exists()).toBe(true)
    expect(wrapper.find('[data-can-edit="true"]').exists()).toBe(true)
  })

  it("treats an empty owner id like an anonymous-created editable event", async () => {
    loaderEventState.value = {
      ...loaderEventState.value,
      ownerId: "",
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: eventDescriptionCanEditStub,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.find("#edit-event-btn").exists()).toBe(true)
    expect(wrapper.find('[data-can-edit="true"]').exists()).toBe(true)
  })

  it("does not auto-open the group invitation dialog for anonymous editable groups", async () => {
    routeState.value = { name: "group", query: {} }
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.GROUP,
      ownerId: guestUserId,
      responses: {},
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: invitationDialogStub,
          HelpDialog: true,
          EventDescription: eventDescriptionCanEditStub,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.find("#edit-event-btn").exists()).toBe(true)
    expect(wrapper.find('[data-can-edit="true"]').exists()).toBe(true)
    expect(wrapper.find('[data-invitation-open="true"]').exists()).toBe(false)
  })

  it("auto-opens the group invitation dialog for non-editable group viewers without a response", async () => {
    routeState.value = { name: "group", query: {} }
    loaderEventState.value = {
      ...createDefaultEventState(),
      type: eventTypes.GROUP,
      ownerId: "owner-1",
      responses: {},
    }

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: invitationDialogStub,
          HelpDialog: true,
          EventDescription: eventDescriptionCanEditStub,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.find('[data-can-edit="true"]').exists()).toBe(false)
    expect(wrapper.find('[data-invitation-open="true"]').exists()).toBe(true)
  })

  it("owns global listeners from mount through unmount and runs bootstrap on mount", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener")
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")

    const wrapper = shallowMount(EventView, {
      props: {
        eventId: "dEeaF",
      },
      global: {
        stubs: {
          ScheduleOverlap: ScheduleOverlapStub,
          NewDialog: true,
          GuestDialog: true,
          SignUpForSlotDialog: true,
          SignInNotSupportedDialog: true,
          MarkAvailabilityDialog: true,
          InvitationDialog: true,
          HelpDialog: true,
          EventDescription: true,
          FormerlyKnownAs: true,
          AsyncPubliftAd: true,
          AccessDenied: true,
          NotSignedIn: true,
          RouterLink: true,
          "v-chip": true,
          "v-icon": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-dialog": true,
          "v-spacer": true,
          "v-btn": true,
        },
      },
    })

    await flushDeferredMount()
    await Promise.resolve()

    expect(refreshEventMock).toHaveBeenCalled()
    expect(checkOwnerPremiumMock).toHaveBeenCalled()
    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function))

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function))
  })
})
