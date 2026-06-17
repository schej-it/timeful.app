// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { computed } from "vue"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { passThroughStub } from "@/test/componentStubs"
import { numFreeEvents, upgradeDialogTypes } from "@/constants"
import EventType from "./EventType.vue"

const { captureMock, showUpgradeDialogMock } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  showUpgradeDialogMock: vi.fn(),
}))

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    lgAndUp: computed(() => false),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showUpgradeDialog: showUpgradeDialogMock,
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    authUser: computed(() => ({
      numEventsCreated: 1,
    })),
    enablePaywall: computed(() => true),
    viewerHasPremiumAccess: computed(() => false),
  }),
}))

const mountEventType = () =>
  mount(EventType, {
    props: {
      eventType: {
        header: "Events I created",
        events: [
          { _id: "evt-1", name: "First event" },
          { _id: "evt-2", name: "Second event" },
          { _id: "evt-3", name: "Third event" },
          { _id: "evt-4", name: "Fourth event" },
          { _id: "evt-5", name: "Fifth event" },
        ] as never[],
      },
    },
    global: {
      stubs: {
        EventItem: {
          props: {
            event: {
              type: Object,
              required: true,
            },
          },
          template: '<div class="event-item">{{ event.name }}</div>',
        },
        FeatureNotReadyDialog: {
          props: {
            modelValue: {
              type: Boolean,
              default: false,
            },
          },
          template: '<div class="feature-dialog" :data-open="modelValue" />',
        },
        "v-btn": {
          template: '<button><slot /></button>',
        },
        "v-expand-transition": passThroughStub,
        "v-icon": true,
      },
    },
  })

describe("EventType", () => {
  beforeEach(() => {
    captureMock.mockReset()
    showUpgradeDialogMock.mockReset()
  })

  it("opens the feature-not-ready dialog from the folder CTA and tracks the click", async () => {
    const wrapper = mountEventType()

    expect(wrapper.text()).toContain(
      `1 / ${String(numFreeEvents)} free events created`
    )
    expect(wrapper.get(".feature-dialog").attributes("data-open")).toBe("false")

    await wrapper.get("button").trigger("click")

    expect(wrapper.get(".feature-dialog").attributes("data-open")).toBe("true")
    expect(captureMock).toHaveBeenCalledWith("create_folder_clicked")
  })

  it("opens the upgrade dialog from the usage row", async () => {
    const wrapper = mountEventType()

    const upgradeTrigger = wrapper
      .findAll("div")
      .find(node => node.text() === "Upgrade")

    if (upgradeTrigger == null) {
      throw new Error("Expected Upgrade trigger")
    }

    await upgradeTrigger.trigger("click")

    expect(showUpgradeDialogMock).toHaveBeenCalledWith({
      type: upgradeDialogTypes.UPGRADE_MANUALLY,
    })
  })
})
