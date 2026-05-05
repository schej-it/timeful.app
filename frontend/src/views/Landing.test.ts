// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import Landing from "./Landing.vue"

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

describe("Landing", () => {
  it("renders landing highlights without injecting raw HTML", async () => {
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
          "v-btn": PassThroughStub,
          "v-icon": true,
          "v-img": true,
          "v-spacer": true,
          "v-tooltip": VTooltipStub,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain("Create a Timeful event")
    expect(wrapper.findAll(".reddit-comment .rdt-h")).toHaveLength(5)
    expect(wrapper.html()).not.toContain("v-html")
  })
})
