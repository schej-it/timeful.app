// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { computed, nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, guestUserId } from "@/constants"
import EventView from "./Event.vue"

type GuestResponseMap = Record<
  string,
  {
    name: string
    user: {
      _id: string
      firstName: string
      lastName: string
      email: string
    }
    availability: unknown[]
  }
>

const {
  editGuestAvailabilityMock,
  authUserState,
  curGuestIdState,
  loaderEventState,
  refreshEventMock,
  checkOwnerPremiumMock,
  fetchCalendarAvailabilitiesMock,
  fetchAuthUserCalendarEventsMock,
} = vi.hoisted(() => ({
  editGuestAvailabilityMock: vi.fn(),
  authUserState: { value: null as null | { _id: string } },
  curGuestIdState: { value: "" },
  refreshEventMock: vi.fn().mockResolvedValue(undefined),
  checkOwnerPremiumMock: vi.fn().mockResolvedValue(undefined),
  fetchCalendarAvailabilitiesMock: vi.fn().mockResolvedValue(undefined),
  fetchAuthUserCalendarEventsMock: vi.fn().mockResolvedValue(undefined),
  loaderEventState: {
    value: {
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
    } as {
      _id: string
      shortId: string
      ownerId: string
      name: string
      type: string
      responses: GuestResponseMap
      blindAvailabilityEnabled: boolean
    },
  },
}))

const scheduleOverlapMethodMocks = {
  scheduleEvent: vi.fn(),
  cancelScheduleEvent: vi.fn(),
  confirmScheduleEvent: vi.fn(),
}

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useRoute: () => ({
    query: {},
  }),
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
    showError: vi.fn(),
    setAuthUser: vi.fn(),
  }),
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: ref(false),
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
    addAvailabilityAsGuest: vi.fn(),
    cancelEditing: vi.fn(),
    copyLink: vi.fn(),
    deleteAvailability: vi.fn(),
    editEvent: vi.fn(),
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
  },
  data() {
    return {
      selectedGuestRespondent: "khh",
      respondents: [{ _id: "khh", name: "khh" }],
      editing: false,
      scheduling: false,
      allowScheduleEvent: false,
      unsavedChanges: false,
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
      selectedGuestRespondent: "",
      respondents: [
        { _id: "khh", name: "khh" },
        { _id: "ada", name: "ada" },
      ],
    }
  },
}

const eventDescriptionCanEditStub = {
  name: "EventDescriptionStub",
  props: {
    canEdit: { type: Boolean, required: true },
  },
  template: "<div :data-can-edit=\"String(canEdit)\" />",
}

const buttonClickStub = {
  template: "<button @click=\"$emit('click', $event)\"><slot /></button>",
}

const buttonSemanticStub = {
  inheritAttrs: false,
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
    >
      <slot />
    </button>
  `,
}

describe("Event guest edit action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    authUserState.value = null
    curGuestIdState.value = ""
    loaderEventState.value = {
      _id: "evt-1",
      shortId: "dEeaF",
      ownerId: "owner-1",
      name: "dfg",
      type: eventTypes.SPECIFIC_DATES,
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
  })

  async function flushDeferredMount() {
    await nextTick()
    vi.runAllTimers()
    await nextTick()
  }

  it("shows Edit guest availability by default when a single guest respondent exists", async () => {
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

    expect(wrapper.text()).toContain("Edit khh's availability")
  })

  it("shows Add availability when multiple guest responses exist without an explicit guest target", async () => {
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

    expect(wrapper.text()).toContain("Add availability")
    expect(wrapper.text()).not.toContain("Edit khh's availability")
  })

  it("uses curGuestId as the explicit guest edit target for the CTA", async () => {
    curGuestIdState.value = "khh"

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

    const guestEditButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Edit khh's availability"))

    expect(guestEditButton).toBeDefined()
    if (!guestEditButton) {
      throw new Error("Expected guest edit button to be rendered")
    }

    await guestEditButton.trigger("click")

    expect(editGuestAvailabilityMock).toHaveBeenCalledWith("khh")
  })

  it("uses generic edit copy for blind availability when a guest target is selected", async () => {
    curGuestIdState.value = "khh"
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
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")
    expect(wrapper.text()).not.toContain("Edit khh's availability")
  })

  it("passes the explicit guest respondent target instead of the click event", async () => {
    curGuestIdState.value = "khh"

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

    const guestEditButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Edit khh's availability"))

    expect(guestEditButton).toBeDefined()
    if (!guestEditButton) {
      throw new Error("Expected guest edit button to be rendered")
    }

    await guestEditButton.trigger("click")

    expect(editGuestAvailabilityMock).toHaveBeenCalledWith("khh")
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

  it("renders the owner edit button with explicit primary text-button semantics", async () => {
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
    expect(ownerEditButton.attributes("data-variant")).toBe("text")
    expect(ownerEditButton.attributes("data-color")).toBe("primary")
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
