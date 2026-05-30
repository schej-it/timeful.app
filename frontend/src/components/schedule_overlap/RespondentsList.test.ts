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
      ownedGuestResponseLookupKeys: [],
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

  it("keeps the respondent action in the same inline row as the respondent name", () => {
    const wrapper = mountRespondentsList({
      curDate: zdt("2026-01-01T09:00:00Z"),
      setEntry: zdt("2026-01-01T09:00:00Z"),
    })

    const nameActionRow = wrapper.find(".tw-flex.tw-items-center.tw-justify-between.tw-gap-2")
    expect(nameActionRow.exists()).toBe(true)
    expect(nameActionRow.find(".respondent-name-line").exists()).toBe(true)
    expect(nameActionRow.find(".respondent-row-actions").exists()).toBe(true)
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

  it("renders guest respondents without leaking undefined last names", () => {
    const wrapper = shallowMount(RespondentsList, {
      props: {
        eventId: "evt-1",
        event: {
          blindAvailabilityEnabled: false,
          collectEmails: false,
          dates: [zdt("2026-01-01T09:00:00Z").toPlainDate()],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          duration: durations.ONE_HOUR,
          daysOnly: false,
        },
        curGuestId: "",
        ownedGuestResponseLookupKeys: [],
        guestResponseLookupKey: "",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { "guest-1": true },
        respondents: [
          {
            _id: "guest-1",
            firstName: "Ada",
          } as never,
        ],
        parsedResponses: {
          "guest-1": {
            user: {
              _id: "guest-1",
              firstName: "Ada",
            } as never,
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
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: sharedRespondentsListStubs,
      },
    })

    expect(wrapper.text()).toContain("Ada")
    expect(wrapper.text()).not.toContain("undefined")
  })

  it("does not render desktop event options beneath the respondents list", () => {
    isPhoneValue.value = false

    const baseDate = zdt("2026-01-01T09:00:00Z")

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
        ownedGuestResponseLookupKeys: ["guest"],
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
        hideIfNeeded: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: { stubs: sharedRespondentsListStubs },
    })

    expect(wrapper.text()).not.toContain("Options")
    expect(wrapper.text()).not.toContain("Show best times")
    expect(wrapper.text()).not.toContain("Show all hours")
    isPhoneValue.value = true
  })

  it("keeps desktop timed respondents content-only when there are zero responses", () => {
    isPhoneValue.value = false

    const baseDate = zdt("2026-01-01T09:00:00Z")

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
        ownedGuestResponseLookupKeys: [],
        guestResponseLookupKey: "",
        days: [],
        times: [],
        curDate: baseDate,
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: {},
        respondents: [],
        parsedResponses: {},
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
        hideIfNeeded: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: { stubs: sharedRespondentsListStubs },
    })

    expect(wrapper.text()).not.toContain("Options")
    expect(wrapper.text()).not.toContain("Show all hours")
    expect(wrapper.text()).not.toContain("Hide if needed times")

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

  it("does not render an inline add-availability CTA in the respondents panel", () => {
    expect(respondentsListSource).not.toContain("+ Add availability")
    expect(respondentsListSource).not.toContain("+ Add guest availability")
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
        ownedGuestResponseLookupKeys: ["guest"],
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

  it("renders a lock for protected guest responses owned by someone else", () => {
    isPhoneValue.value = false

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
        ownedGuestResponseLookupKeys: [],
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
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-icon": VIconStub,
        },
      },
    })

    const lockStatus = wrapper.get(".respondent-edit-status")
    expect(lockStatus.attributes("aria-disabled")).toBe("true")
    expect(lockStatus.attributes("aria-label")).toContain("cannot be edited")
    expect(lockStatus.classes()).toContain("tw-h-5")
    expect(lockStatus.classes()).toContain("tw-w-5")
    expect(lockStatus.classes()).toContain("tw-text-sm")
    expect(lockStatus.text()).toContain("mdi-lock")
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
        ownedGuestResponseLookupKeys: ["Legacy Ada"],
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
        ownedGuestResponseLookupKeys: [],
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

  it("shows a direct pencil on mobile without an overflow menu for editable guests", () => {
    isPhoneValue.value = true

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
        ownedGuestResponseLookupKeys: ["guest"],
        guestResponseLookupKey: "guest",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { guest: true },
        respondents: [{ _id: "guest", firstName: "guest", lastName: "" }],
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
        hideIfNeeded: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-icon": VIconStub,
        },
      },
    })

    const pencilStatus = wrapper.get(".respondent-edit-status")
    expect(pencilStatus.element.tagName).toBe("BUTTON")
    expect(pencilStatus.attributes("aria-disabled")).toBe("false")
    expect(pencilStatus.attributes("aria-label")).toContain("Edit guest")
    expect(pencilStatus.classes()).toContain("tw-h-5")
    expect(pencilStatus.classes()).toContain("tw-w-5")
    expect(pencilStatus.classes()).toContain("tw-text-sm")
    expect(pencilStatus.text()).toContain("mdi-pencil")
    expect(wrapper.text()).not.toContain("mdi-dots-vertical")
  })

  it("shows a direct lock on mobile without an overflow menu for non-editable responses", () => {
    isPhoneValue.value = true

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
        ownedGuestResponseLookupKeys: [],
        guestResponseLookupKey: "",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { "user-1": true },
        respondents: [
          {
            _id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
          } as never,
        ],
        parsedResponses: {
          "user-1": {
            user: {
              _id: "user-1",
              firstName: "Ada",
              lastName: "Lovelace",
            } as never,
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
        hideIfNeeded: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: {
          ...sharedRespondentsListStubs,
          "v-icon": VIconStub,
        },
      },
    })

    const lockStatus = wrapper.get(".respondent-edit-status")
    expect(lockStatus.element.tagName).toBe("DIV")
    expect(lockStatus.attributes("aria-disabled")).toBe("true")
    expect(lockStatus.attributes("aria-label")).toContain("cannot be edited")
    expect(lockStatus.classes()).toContain("tw-h-5")
    expect(lockStatus.classes()).toContain("tw-w-5")
    expect(lockStatus.classes()).toContain("tw-text-sm")
    expect(lockStatus.text()).toContain("mdi-lock")
    expect(wrapper.text()).not.toContain("mdi-dots-vertical")
  })

  it("does not render mobile row-level delete for owners", () => {
    isPhoneValue.value = true

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
        ownedGuestResponseLookupKeys: [],
        guestResponseLookupKey: "",
        days: [],
        times: [],
        curDate: zdt("2026-01-01T09:00:00Z"),
        curRespondent: "",
        curRespondents: [],
        curTimeslot: { dayIndex: -1, timeIndex: -1 },
        curTimeslotAvailability: { "user-1": true },
        respondents: [
          {
            _id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
          } as never,
        ],
        parsedResponses: {
          "user-1": {
            user: {
              _id: "user-1",
              firstName: "Ada",
              lastName: "Lovelace",
            } as never,
            availability: new ZdtSet(),
            ifNeeded: new ZdtSet(),
            guest: false,
          },
        },
        isOwner: true,
        isGroup: false,
        showCalendarEvents: false,
        responsesFormatted: new ZdtMap<Set<string>>(),
        timezone: {
          value: UTC,
          offset: durations.ZERO,
          label: UTC,
          gmtString: "GMT",
        },
        hideIfNeeded: false,
        guestAddedAvailability: false,
        addingAvailabilityAsGuest: false,
      },
      global: {
        stubs: sharedRespondentsListStubs,
      },
    })

    expect(wrapper.text()).not.toContain("mdi-delete")
  })
})
