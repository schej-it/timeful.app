// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import { authTypes, calendarTypes } from "@/constants"
import Auth from "./Auth.vue"

const {
  routeState,
  routerReplaceMock,
  postMock,
  getMock,
} = vi.hoisted(() => ({
  routeState: {
    query: {
      code: "oauth-code",
      state: "",
    },
  },
  routerReplaceMock: vi.fn(),
  postMock: vi.fn(),
  getMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: postMock,
    get: getMock,
    getEventsCreated: vi.fn(() => []),
    deleteEventsCreated: vi.fn(),
  }
})

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => {
  return {
    useMainStore: () => ({
      authUser: ref(null),
      setAuthUser: vi.fn(),
    }),
  }
})

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    identify: vi.fn(),
  },
}))

describe("Auth sign-up restore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.query = {
      code: "oauth-code",
      state: encodeURIComponent(
        JSON.stringify({
          type: authTypes.SIGN_UP_SIGN_IN,
          signUpId: "signup-1",
          calendarType: calendarTypes.GOOGLE,
        })
      ),
    }
    postMock.mockResolvedValue({
      _id: "user-1",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    })
  })

  it("restores the sign-up route after OAuth returns", async () => {
    shallowMount(Auth)

    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith({
      name: "signUp",
      params: { signUpId: "signup-1" },
    })
  })
})
