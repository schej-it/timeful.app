// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@unhead/vue", () => ({
  useHead: vi.fn(),
}))

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    mdAndUp: ref(false),
    name: ref("xs"),
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: ref(null),
    setAuthUser: vi.fn(),
  }),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<object>("@/utils")

  return {
    ...actual,
    signInGoogle: vi.fn(),
    signInOutlook: vi.fn(),
  }
})

vi.mock("@/utils/signInAvailability", () => ({
  signInEnabled: false,
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: false,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    identify: vi.fn(),
  },
}))

vi.mock("@vimeo/player", () => ({
  default: class Player {
    on = vi.fn()
    off = vi.fn()
    destroy = vi.fn()
  },
}))

const PassThroughStub = {
  template: "<div><slot /></div>",
}

const VTooltipStub = {
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
}

describe("Landing sign-in disabled", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("hides the landing header sign-in button", async () => {
    const { default: Landing } = await import("./Landing.vue")

    const wrapper = shallowMount(Landing, {
      global: {
        stubs: {
          AuthUserMenu: true,
          FAQ: true,
          Footer: true,
          FormerlyKnownAs: true,
          Header: PassThroughStub,
          HowItWorksDialog: true,
          LandingPageHeader: PassThroughStub,
          Logo: true,
          NewDialog: true,
          NumberBullet: PassThroughStub,
          SignInDialog: true,
          "v-avatar": PassThroughStub,
          "v-btn": { template: "<button><slot /></button>" },
          "v-icon": true,
          "v-img": true,
          "v-spacer": true,
          "v-tooltip": VTooltipStub,
        },
      },
    })

    await flushPromises()

    expect(wrapper.findAll("button").some(button => button.text() === "Sign in")).toBe(false)
  })
})
