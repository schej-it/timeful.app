// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import DiscordBanner from "./DiscordBanner.vue"

const discordUrl = "https://discord.gg/v6raNqYxx3"
const storageKey = "discordBannerDismissed_v1"

const { captureMock, routeState } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  routeState: {
    name: "landing",
  },
}))

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: ref(false),
  }),
}))

const VBtnStub = {
  props: {
    href: {
      type: String,
      default: undefined,
    },
    target: {
      type: String,
      default: undefined,
    },
  },
  emits: ["click"],
  template: `
    <button :data-href="href" :data-target="target" @click="$emit('click')">
      <slot />
    </button>
  `,
}

const mountBanner = () =>
  mount(DiscordBanner, {
    global: {
      stubs: {
        "v-btn": VBtnStub,
        "v-icon": true,
      },
    },
  })

describe("DiscordBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("localStorage", createLocalStorageMock())
    routeState.name = "landing"
  })

  it("shows only on the landing route", () => {
    const landingWrapper = mountBanner()
    expect(landingWrapper.text()).toContain("Join our Discord community")

    routeState.name = "home"
    const homeWrapper = mountBanner()
    expect(homeWrapper.text()).toBe("")
  })

  it("persists dismissal and tracks the dismiss event", async () => {
    const wrapper = mountBanner()
    const buttons = wrapper.findAll("button")
    const dismissButton = buttons[buttons.length - 1]

    await dismissButton.trigger("click")

    expect(localStorage.getItem(storageKey)).toBe("true")
    expect(captureMock).toHaveBeenCalledWith("discord_banner_dismissed")

    const remountedWrapper = mountBanner()
    expect(remountedWrapper.text()).toBe("")
  })

  it("tracks clicks on the Discord CTA", async () => {
    const wrapper = mountBanner()
    const buttons = wrapper.findAll("button")
    const joinButton = buttons[0]

    await joinButton.trigger("click")

    expect(captureMock).toHaveBeenCalledWith("discord_banner_clicked", {
      discordUrl,
    })
  })
})
