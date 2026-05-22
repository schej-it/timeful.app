// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { computed, defineComponent, h, nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, guestUserId } from "@/constants"
import EventView from "./Event.vue"

const {
  editGuestAvailabilityMock,
  authUserState,
  loaderEventState,
  refreshEventMock,
  checkOwnerPremiumMock,
  fetchCalendarAvailabilitiesMock,
  fetchAuthUserCalendarEventsMock,
} = vi.hoisted(() => ({
  editGuestAvailabilityMock: vi.fn(),
  authUserState: { value: null as null | { _id: string } },
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
    },
  },
}))

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
    curGuestId: ref(""),
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

const ScheduleOverlapStub = defineComponent({
  name: "ScheduleOverlap",
  props: {
    event: {
      type: Object,
      required: false,
      default: null,
    },
  },
  setup(_, { expose }) {
    expose({
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
    })

    return () => h("div")
  },
})

describe("Event guest edit action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    authUserState.value = null
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

  it("passes the selected guest respondent id instead of the click event", async () => {
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
          "v-btn": {
            template: "<button @click=\"$emit('click', $event)\"><slot /></button>",
          },
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
          "v-btn": defineComponent({
            name: "VBtnStub",
            inheritAttrs: false,
            props: {
              id: { type: String, default: "" },
              variant: { type: String, default: "" },
              color: { type: String, default: "" },
            },
            setup(props, { slots, attrs }) {
              return () =>
                h(
                  "button",
                  {
                    ...attrs,
                    id: props.id,
                    "data-variant": props.variant,
                    "data-color": props.color,
                  },
                  slots.default?.()
                )
            },
          }),
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

    const EventDescriptionStub = defineComponent({
      name: "EventDescriptionStub",
      props: {
        canEdit: { type: Boolean, required: true },
      },
      setup(props) {
        return () => h("div", { "data-can-edit": String(props.canEdit) })
      },
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
          EventDescription: EventDescriptionStub,
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
          "v-btn": defineComponent({
            name: "VBtnStub",
            inheritAttrs: false,
            props: {
              id: { type: String, default: "" },
              variant: { type: String, default: "" },
              color: { type: String, default: "" },
            },
            setup(props, { slots, attrs }) {
              return () =>
                h(
                  "button",
                  {
                    ...attrs,
                    id: props.id,
                    "data-variant": props.variant,
                    "data-color": props.color,
                  },
                  slots.default?.()
                )
            },
          }),
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

    const EventDescriptionStub = defineComponent({
      name: "EventDescriptionStub",
      props: {
        canEdit: { type: Boolean, required: true },
      },
      setup(props) {
        return () => h("div", { "data-can-edit": String(props.canEdit) })
      },
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
          EventDescription: EventDescriptionStub,
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
