// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { computed, nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, guestUserId } from "@/constants"
import EventView from "./Event.vue"

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
  responses: Record<string, EventTestResponse>
  blindAvailabilityEnabled: boolean
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
  curGuestIdState,
  loaderEventState,
  refreshEventMock,
  checkOwnerPremiumMock,
  fetchCalendarAvailabilitiesMock,
  fetchAuthUserCalendarEventsMock,
  routerPushMock,
  routerReplaceMock,
  showErrorMock,
} = vi.hoisted(() => ({
  editGuestAvailabilityMock: vi.fn(),
  editOwnedGuestAvailabilityMock: vi.fn(),
  authUserState: { value: null as null | { _id: string } },
  curGuestIdState: { value: "" },
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
}))

const scheduleOverlapMethodMocks = {
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
  useRoute: () => ({
    name: "event",
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
    showError: showErrorMock,
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
      ...createDefaultEventState(),
      type: eventTypes.SPECIFIC_DATES,
    }
  })

  async function flushDeferredMount() {
    await nextTick()
    vi.runAllTimers()
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
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")
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
          "v-spacer": true,
          "v-btn": buttonClickStub,
        },
      },
    })

    await flushDeferredMount()

    expect(wrapper.text()).toContain("Edit availability")
    expect(wrapper.text()).not.toContain("Add availability")
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

    const tokenOption = wrapper.findAll("button").at(-1)
    if (tokenOption == null) {
      throw new Error("Expected token guest menu option to be rendered")
    }

    await tokenOption.trigger("click")

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
