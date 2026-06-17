// @vitest-environment happy-dom

import { flushPromises, mount, shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"
import { authTypes } from "@/constants"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  nullStub,
  passThroughStub,
  vTextFieldStub,
} from "@/test/componentStubs"
import SignIn from "./SignIn.vue"

const {
  postMock,
  routeState,
  signInGoogleMock,
  signInOutlookMock,
} = vi.hoisted(() => ({
  postMock: vi.fn(),
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
    post: postMock,
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

const signInStubs = mergeComponentStubs({
  "router-link": true,
  "v-btn": buttonStubWithDisabled,
  "v-card": passThroughStub,
  "v-card-text": passThroughStub,
  "v-card-title": passThroughStub,
  "v-divider": nullStub,
  "v-icon": nullStub,
  "v-img": nullStub,
  "v-spacer": nullStub,
  "v-text-field": vTextFieldStub,
})

const findTextFieldByPlaceholder = (
  wrapper: ReturnType<typeof mount<typeof SignIn>>,
  placeholder: string
) => {
  const field = wrapper
    .findAllComponents(vTextFieldStub)
    .find(component => component.props("placeholder") === placeholder)

  if (field == null) {
    throw new Error(`Expected text field with placeholder "${placeholder}"`)
  }

  return field
}

const findButtonByText = (
  wrapper: ReturnType<typeof mount<typeof SignIn>>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("SignIn auth restore state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postMock.mockReset()
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
    postMock.mockReset()
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

describe("SignIn Vuetify field contracts", () => {
  beforeEach(() => {
    postMock.mockReset()
    routeState.query = {}
  })

  it(
    "uses variant solo for the email and onboarding fields",
    async () => {
      postMock.mockResolvedValueOnce({ isNewUser: true })

      const wrapper = mount(SignIn, {
        global: {
          stubs: signInStubs,
        },
      })

      const emailField = findTextFieldByPlaceholder(wrapper, "Enter your email...")
      expect(emailField.props("variant")).toBe("solo")

      await wrapper
        .get('input[placeholder="Enter your email..."]')
        .setValue("new@example.com")
      await findButtonByText(wrapper, "Continue with Email").trigger("click")
      await flushPromises()

      const firstNameField = findTextFieldByPlaceholder(wrapper, "First name")
      const lastNameField = findTextFieldByPlaceholder(
        wrapper,
        "Last name (optional)"
      )
      const disabledEmailField = findTextFieldByPlaceholder(wrapper, "Email...")

      expect(firstNameField.props("variant")).toBe("solo")
      expect(lastNameField.props("variant")).toBe("solo")
      expect(disabledEmailField.props("variant")).toBe("solo")
      expect(disabledEmailField.props("modelValue")).toBe("new@example.com")
      expect(disabledEmailField.props("disabled")).toBe(true)
    },
    10000
  )

  it("uses variant solo for the OTP field", async () => {
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)

    const wrapper = mount(SignIn, {
      global: {
        stubs: signInStubs,
      },
    })

    await wrapper.get('input[placeholder="Enter your email..."]').setValue("existing@example.com")
    await findButtonByText(wrapper, "Continue with Email").trigger("click")
    await flushPromises()

    const otpField = findTextFieldByPlaceholder(wrapper, "Enter 6-digit code...")

    expect(otpField.props("variant")).toBe("solo")
    expect(otpField.props("maxlength")).toBe("6")
  })
})
