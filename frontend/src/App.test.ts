// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import { authTypes } from "@/constants"
import App from "./App.vue"

const {
  signInGoogleMock,
  signInOutlookMock,
  getMock,
  postMock,
  routeState,
  routerPushMock,
  routerReplaceMock,
} = vi.hoisted(() => ({
  signInGoogleMock: vi.fn(),
  signInOutlookMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
  routeState: {
    name: "signUp",
    params: { signUpId: "signup-1" },
    query: {},
    fullPath: "/s/signup-1",
  },
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    get: getMock,
    post: postMock,
    getLocation: vi.fn(),
    signInGoogle: signInGoogleMock,
    signInOutlook: signInOutlookMock,
  }
})

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
}))

vi.mock("@unhead/vue", () => ({
  useHead: vi.fn(),
}))

vi.mock("is-ua-webview", () => ({
  default: vi.fn(() => false),
}))

vi.mock("pinia", () => ({
  storeToRefs: (store: Record<string, unknown>) => ({
    authUser: store.authUser,
    error: store.error,
    info: store.info,
    upgradeDialogVisible: store.upgradeDialogVisible,
    newDialogOptions: store.newDialogOptions,
    isPremiumUser: store.isPremiumUser,
  }),
}))

vi.mock("@/stores/main", () => {
  return {
    useMainStore: () => ({
      authUser: ref(null),
      error: ref(""),
      info: ref(""),
      upgradeDialogVisible: ref(false),
      newDialogOptions: ref({
        show: false,
        contactsPayload: {},
        openNewGroup: false,
        eventOnly: false,
        folderId: null,
      }),
      isPremiumUser: ref(false),
      setAuthUser: vi.fn(),
      setFeatureFlagsLoaded: vi.fn(),
      hideUpgradeDialog: vi.fn(),
      createNew: vi.fn(),
      getEvents: vi.fn(),
    }),
  }
})

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
    identify: vi.fn(),
  },
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: { value: false },
  }),
}))

const SignInDialogStub = {
  name: "SignInDialog",
  emits: ["sign-in", "email-sign-in", "update:modelValue"],
  template: '<button data-test="provider-sign-in" @click="$emit(\'sign-in\', \'google\')" />',
}

describe("App auth restore state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockRejectedValue(new Error("not signed in"))
    postMock.mockResolvedValue({})
    routeState.name = "signUp"
    routeState.params = { signUpId: "signup-1" }
    routeState.query = {}
    routeState.fullPath = "/s/signup-1"
  })

  it("serializes signUpId when OAuth starts from a sign-up route", async () => {
    const wrapper = shallowMount(App, {
      global: {
        mocks: {
          $route: routeState,
        },
        stubs: {
          SignInDialog: SignInDialogStub,
          DiscordBanner: true,
          AutoSnackbar: true,
          SignInNotSupportedDialog: true,
          NewDialog: true,
          UpgradeDialog: true,
          UpvoteRedditSnackbar: true,
          Logo: true,
          AuthUserMenu: true,
          "router-link": true,
          "router-view": true,
          "v-app": { template: "<div><slot /></div>" },
          "v-main": { template: "<div><slot /></div>" },
          "v-btn": { template: "<button><slot /></button>" },
          "v-expand-x-transition": { template: "<div><slot /></div>" },
          "v-spacer": true,
        },
      },
    })

    await Promise.resolve()
    await wrapper.get('[data-test="provider-sign-in"]').trigger("click")

    expect(signInGoogleMock).toHaveBeenCalledWith({
      state: {
        signUpId: "signup-1",
        type: authTypes.SIGN_UP_SIGN_IN,
      },
      selectAccount: true,
    })
    expect(signInOutlookMock).not.toHaveBeenCalled()
  })
})
