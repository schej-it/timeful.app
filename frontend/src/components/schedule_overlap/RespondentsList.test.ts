// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { Temporal } from "temporal-polyfill"
import { durations, UTC } from "@/constants"
import {
  respondentsListStubs,
  type ComponentStubMap,
} from "@/test/componentStubs"
import { ZdtMap, ZdtSet } from "@/utils"
import RespondentsList from "./RespondentsList.vue"
import respondentsListSource from "./RespondentsList.vue?raw"

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

const isPhoneValue = ref(true)

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: isPhoneValue,
  }),
}))

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)
const sharedRespondentsListStubs: ComponentStubMap = respondentsListStubs

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
      curGuestId: "",
      guestResponseLookupKey: "",
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
          picture: "https://example.com/ada.png",
        } as never,
      ],
      parsedResponses: {
        "user-1": {
          user: {
            _id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
            picture: "https://example.com/ada.png",
          } as never,
          availability: new ZdtSet(),
          ifNeeded: new ZdtSet([setEntry]),
          guest: false,
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
      showAllHours: false,
      showEventOptions: false,
      guestAddedAvailability: false,
      addingAvailabilityAsGuest: false,
    },
    global: {
      stubs: sharedRespondentsListStubs,
    },
  })

describe("RespondentsList", () => {
  it("uses a fixed respondent control slot with hover-visible checkbox shell", () => {
    const wrapper = mountRespondentsList({
      curDate: zdt("2026-01-01T09:00:00Z"),
      setEntry: zdt("2026-01-01T09:00:00Z"),
    })

    const respondentRow = wrapper.find(".respondent-row")
    const labelColumn = wrapper.find(".tw-flex.tw-flex-col.tw-justify-center")
    const nameLabel = wrapper.find(".tw-mr-1.tw-text-sm.tw-leading-5.tw-transition-all")
    const controlSlot = wrapper.find(
      ".tw-ml-1.tw-mr-3.tw-flex.tw-h-5.tw-w-5.tw-shrink-0.tw-items-center.tw-justify-center"
    )

    expect(respondentRow.classes()).toContain("tw-text-sm")
    expect(respondentRow.classes()).toContain("tw-leading-5")
    expect(labelColumn.exists()).toBe(true)
    expect(nameLabel.exists()).toBe(true)
    expect(controlSlot.exists()).toBe(true)
    expect(wrapper.findComponent({ name: "UserAvatarContent" }).exists()).toBe(true)
    const selectionButton = wrapper.find('button[aria-pressed="false"]')
    const checkboxShell = selectionButton.find(".respondent-control__checkbox")
    const avatar = selectionButton.find(".respondent-control__avatar")

    expect(selectionButton.exists()).toBe(true)
    expect(selectionButton.classes()).toContain("tw-appearance-none")
    expect(selectionButton.classes()).toContain("tw-h-5")
    expect(selectionButton.classes()).toContain("tw-w-5")
    expect(selectionButton.classes()).toContain("respondent-control")
    expect(avatar.exists()).toBe(true)
    expect(avatar.classes()).toContain("tw-flex")
    expect(checkboxShell.exists()).toBe(true)
    expect(checkboxShell.classes()).toContain("tw-flex")
    expect(checkboxShell.classes()).toContain("tw-h-4")
    expect(checkboxShell.classes()).toContain("tw-w-4")
    expect(checkboxShell.classes()).toContain("tw-border-2")
    expect(checkboxShell.classes()).toContain("tw-border-solid")
    expect(checkboxShell.classes()).not.toContain("tw-border-primary")
    expect(checkboxShell.attributes("style")).toContain(
      "border-color: var(--timeful-primary-action-bg);"
    )
  })

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

  it("relays false when the desktop best-times switch is toggled off", async () => {
    isPhoneValue.value = false

    const baseDate = zdt("2026-01-01T09:00:00Z")
    const VSwitchStub = {
      emits: ["update:modelValue"],
      template:
        '<button class="desktop-best-times-toggle" @click="$emit(\'update:modelValue\', false)" />',
    }

    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [baseDate.toPlainDate()],
          timeSeed: baseDate,
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        guestResponseLookupKey: "guest",
        days: [],
        times: [],
        curDate: baseDate,
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { "user-1": true, "user-2": true },
        respondents: [
          {
            _id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
          },
          {
            _id: "user-2",
            firstName: "Grace",
            lastName: "Hopper",
          },
        ],
        parsedResponses: {
          "user-1": {
            user: {
              _id: "user-1",
              firstName: "Ada",
              lastName: "Lovelace",
            },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: false,
          },
          "user-2": {
            user: {
              _id: "user-2",
              firstName: "Grace",
              lastName: "Hopper",
            },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: false,
          },
        },
        isOwner: false,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        showBestTimes: true,
        hideIfNeeded: false,
        showAllHours: false,
        showEventOptions: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-switch": VSwitchStub,
        },
      },
    })

    await wrapper.get(".desktop-best-times-toggle").trigger("click")

    expect(wrapper.emitted("update:showBestTimes")).toEqual([[false]])
    isPhoneValue.value = true
  })

  it("uses explicit Vuetify 3 select and list props for export actions", () => {
    expect(respondentsListSource).toContain('<v-list class="tw-py-1" density="compact">')
    expect(respondentsListSource).toContain('class="timeful-solo-field"')
    expect(respondentsListSource).toContain('variant="solo"')
    expect(respondentsListSource).toContain('item-title="text"')
    expect(respondentsListSource).toContain('item-value="value"')
    expect(respondentsListSource).not.toContain("<v-list class=\"tw-py-1\" dense>")
    expect(respondentsListSource).not.toContain("\n                      solo\n")
    expect(respondentsListSource).not.toContain('item-text="text"')
  })

  it("keeps row clicks separate from the guest pencil edit action", async () => {
    isPhoneValue.value = false

    const VBtnStub = {
      emits: ["click"],
      template: '<button @click.stop="$emit(\'click\', $event)"><slot /></button>',
    }
    const VIconStub = {
      template: "<span><slot /></span>",
    }

    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [Temporal.PlainDate.from("2026-01-01")],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        guestResponseLookupKey: "guest",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { guest: true },
        respondents: [
          {
            _id: "guest",
            firstName: "guest",
            lastName: "",
          },
        ],
        parsedResponses: {
          guest: {
            user: {
              _id: "guest",
              firstName: "guest",
              lastName: "",
            },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: true,
          },
        },
        isOwner: false,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        showBestTimes: false,
        hideIfNeeded: false,
        showAllHours: false,
        showEventOptions: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-btn": VBtnStub,
          "v-icon": VIconStub,
        },
      },
    })

    await wrapper.get(".respondent-row").trigger("click")

    const pencilButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("mdi-pencil"))

    expect(pencilButton).toBeDefined()
    if (!pencilButton) {
      throw new Error("Expected guest pencil action to be rendered")
    }

    await pencilButton.trigger("click")

    expect(wrapper.emitted("clickRespondent")).toEqual([
      [expect.any(MouseEvent), "guest"],
    ])
    expect(wrapper.emitted("editGuestAvailability")).toEqual([["guest"]])
    isPhoneValue.value = true
  })

  it("hides the guest pencil for protected guest responses owned by someone else", () => {
    isPhoneValue.value = false

    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [Temporal.PlainDate.from("2026-01-01")],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        guestResponseLookupKey: "different-guest",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { guest: true },
        respondents: [
          {
            _id: "guest",
            firstName: "guest",
            lastName: "",
          },
        ],
        parsedResponses: {
          guest: {
            user: {
              _id: "guest",
              firstName: "guest",
              lastName: "",
            },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: true,
            guestId: "guest-token-id",
            guestEditPolicy: "protected",
            guestOwnershipMode: "token",
          },
        },
        isOwner: false,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        showBestTimes: false,
        hideIfNeeded: false,
        showAllHours: false,
        showEventOptions: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: sharedRespondentsListStubs,
      },
    })

    expect(wrapper.text()).not.toContain("mdi-pencil")
    isPhoneValue.value = true
  })

  it("shows the guest pencil only for the matching legacy guest row", () => {
    isPhoneValue.value = false

    const VBtnStub = {
      template: "<button><slot /></button>",
    }
    const VIconStub = {
      template: "<span><slot /></span>",
    }

    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [Temporal.PlainDate.from("2026-01-01")],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        guestResponseLookupKey: "Legacy Ada",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { "Legacy Ada": true, "Legacy Grace": true },
        respondents: [
          { _id: "Legacy Ada", firstName: "Legacy Ada", lastName: "" },
          { _id: "Legacy Grace", firstName: "Legacy Grace", lastName: "" },
        ],
        parsedResponses: {
          "Legacy Ada": {
            user: { _id: "Legacy Ada", firstName: "Legacy Ada", lastName: "" },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: true,
            guestOwnershipMode: "legacy",
          },
          "Legacy Grace": {
            user: { _id: "Legacy Grace", firstName: "Legacy Grace", lastName: "" },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: true,
            guestOwnershipMode: "legacy",
          },
        },
        isOwner: false,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        showBestTimes: false,
        hideIfNeeded: false,
        showAllHours: false,
        showEventOptions: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-btn": VBtnStub,
          "v-icon": VIconStub,
        },
      },
    })

    const pencilButtons = wrapper
      .findAll("button")
      .filter((node) => node.text().includes("mdi-pencil"))

    expect(pencilButtons).toHaveLength(1)
    expect(wrapper.text()).toContain("Legacy Ada")
    expect(wrapper.text()).toContain("Legacy Grace")
    isPhoneValue.value = true
  })

  it("keeps token-backed open guest responses editable by another guest", () => {
    isPhoneValue.value = false

    const VBtnStub = {
      template: "<button><slot /></button>",
    }
    const VIconStub = {
      template: "<span><slot /></span>",
    }

    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [Temporal.PlainDate.from("2026-01-01")],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        guestResponseLookupKey: "different-guest",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { guest: true },
        respondents: [
          {
            _id: "guest",
            firstName: "guest",
            lastName: "",
          },
        ],
        parsedResponses: {
          guest: {
            user: {
              _id: "guest",
              firstName: "guest",
              lastName: "",
            },
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: true,
            guestId: "guest-token-id",
            guestEditPolicy: "open",
            guestOwnershipMode: "token",
          },
        },
        isOwner: false,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        showBestTimes: false,
        hideIfNeeded: false,
        showAllHours: false,
        showEventOptions: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-btn": VBtnStub,
          "v-icon": VIconStub,
        },
      },
    })

    expect(wrapper.text()).toContain("mdi-pencil")
    isPhoneValue.value = true
  })
})
