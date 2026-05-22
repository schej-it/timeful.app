// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"
import { authTypes } from "@/constants"
import SignIn from "./SignIn.vue"

const {
  routeState,
  signInGoogleMock,
  signInOutlookMock,
} = vi.hoisted(() => ({
  routeState: {
    query: {},
  },
  signInGoogleMock: vi.fn(),
  signInOutlookMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: vi.fn(),
    signInGoogle: signInGoogleMock,
    signInOutlook: signInOutlookMock,
  }
})

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: vi.fn(),
  }),
}))

vi.mock("@unhead/vue", () => ({
  useHead: vi.fn(),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    setAuthUser: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    identify: vi.fn(),
  },
}))

describe("SignIn auth restore state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.query = {
      signUpId: "signup-1",
      editingMode: "true",
      initialTimezone: JSON.stringify({
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: "PT5H45M",
      }),
      contactsPayload: JSON.stringify({
        name: "Draft",
      }),
    }
  })

  it("serializes restore state when OAuth starts from a dedicated sign-in deep link", async () => {
    const wrapper = shallowMount(SignIn, {
      global: {
        stubs: {
          "router-link": true,
          "v-card": { template: "<div><slot /></div>" },
          "v-card-title": { template: "<div><slot /></div>" },
          "v-card-text": { template: "<div><slot /></div>" },
          "v-spacer": true,
          "v-divider": true,
          "v-img": true,
          "v-text-field": true,
          "v-icon": true,
          "v-btn": {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
          },
        },
      },
    })

    await wrapper.findAll("button")[0].trigger("click")

    expect(signInGoogleMock).toHaveBeenCalledWith({
      state: {
        type: authTypes.SIGN_UP_SIGN_IN,
        signUpId: "signup-1",
        restoreQuery: {
          editingMode: true,
          initialTimezone: {
            value: "Asia/Kathmandu",
            label: "Kathmandu",
            gmtString: "GMT+5:45",
            offset: Temporal.Duration.from("PT5H45M"),
          },
          contactsPayload: {
            name: "Draft",
          },
        },
      },
      selectAccount: true,
    })
    expect(signInOutlookMock).not.toHaveBeenCalled()
  })
})

describe("SignIn mode copy", () => {
  beforeEach(() => {
    routeState.query = {}
  })

  it("renders sign-up copy when the route provides initial sign-up mode", () => {
    const wrapper = shallowMount(SignIn, {
      props: {
        initialIsSignUp: true,
      },
      global: {
        stubs: {
          "router-link": true,
          "v-card": { template: "<div><slot /></div>" },
          "v-card-title": { template: "<div><slot /></div>" },
          "v-card-text": { template: "<div><slot /></div>" },
          "v-spacer": true,
          "v-divider": true,
          "v-img": true,
          "v-text-field": true,
          "v-icon": true,
          "v-btn": {
            template: "<button><slot /></button>",
          },
        },
      },
    })

    expect(wrapper.text()).toContain("Create an account")
    expect(wrapper.text()).toContain("Sign up to get started")
  })

  it("renders sign-in copy by default", () => {
    const wrapper = shallowMount(SignIn, {
      global: {
        stubs: {
          "router-link": true,
          "v-card": { template: "<div><slot /></div>" },
          "v-card-title": { template: "<div><slot /></div>" },
          "v-card-text": { template: "<div><slot /></div>" },
          "v-spacer": true,
          "v-divider": true,
          "v-img": true,
          "v-text-field": true,
          "v-icon": true,
          "v-btn": {
            template: "<button><slot /></button>",
          },
        },
      },
    })

    expect(wrapper.text()).toContain("Welcome back")
    expect(wrapper.text()).toContain("Sign in to your account")
  })
})
