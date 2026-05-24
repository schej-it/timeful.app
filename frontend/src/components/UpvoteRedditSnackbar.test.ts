// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import UpvoteRedditSnackbar from "./UpvoteRedditSnackbar.vue"

const redditUrl =
  "https://www.reddit.com/r/opensource/comments/1klu471/i_made_a_doodle_alternative/"
const storageKey = `upvoteRedditSnackbarDismissed_${redditUrl}`

const { captureMock, routeState } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  routeState: {
    name: "home",
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

const VSnackbarStub = {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div v-if="modelValue">
      <slot />
      <slot name="actions" />
    </div>
  `,
}

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

const mountSnackbar = () =>
  mount(UpvoteRedditSnackbar, {
    global: {
      stubs: {
        "v-btn": VBtnStub,
        "v-icon": true,
        "v-snackbar": VSnackbarStub,
      },
    },
  })

describe("UpvoteRedditSnackbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("localStorage", createLocalStorageMock())
    routeState.name = "home"
  })

  it("shows only on the home route", () => {
    const homeWrapper = mountSnackbar()
    expect(homeWrapper.text()).toContain("Enjoying Timeful?")

    routeState.name = "landing"
    const landingWrapper = mountSnackbar()
    expect(landingWrapper.text()).toBe("")
  })

  it("persists dismissal and tracks the dismiss event", async () => {
    const wrapper = mountSnackbar()
    const buttons = wrapper.findAll("button")
    const dismissButton = buttons[buttons.length - 1]

    await dismissButton.trigger("click")

    expect(localStorage.getItem(storageKey)).toBe("true")
    expect(captureMock).toHaveBeenCalledWith("reddit_upvote_snackbar_dismissed")

    const remountedWrapper = mountSnackbar()
    expect(remountedWrapper.text()).toBe("")
  })

  it("tracks clicks on the Reddit CTA", async () => {
    const wrapper = mountSnackbar()
    const buttons = wrapper.findAll("button")
    const upvoteButton = buttons[0]

    await upvoteButton.trigger("click")

    expect(captureMock).toHaveBeenCalledWith("reddit_upvote_snackbar_clicked", {
      redditUrl,
    })
  })
})
