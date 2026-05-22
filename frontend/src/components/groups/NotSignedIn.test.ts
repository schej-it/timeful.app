// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NotSignedIn from "./NotSignedIn.vue"

const { fetchUserByIdMock, routeState } = vi.hoisted(() => ({
  fetchUserByIdMock: vi.fn(),
  routeState: {
    params: {
      groupId: "group-1",
    },
  },
}))

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: ref(false),
  }),
}))

vi.mock("@/utils/services/UserService", () => ({
  fetchUserById: fetchUserByIdMock,
}))

vi.mock("is-ua-webview", () => ({
  default: vi.fn(() => false),
}))

describe("NotSignedIn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchUserByIdMock.mockResolvedValue({
      _id: "owner-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    })
  })

  it("loads the owner after mount before rendering the invite state", async () => {
    const wrapper = shallowMount(NotSignedIn, {
      props: {
        event: {
          _id: "group-1",
          ownerId: "owner-1",
          name: "Weekly sync",
        },
      },
      global: {
        stubs: {
          UserAvatarContent: true,
          CalendarPermissionsCard: true,
          SignInNotSupportedDialog: true,
          "v-fade-transition": { template: "<div><slot /></div>" },
          "v-btn": { template: "<button><slot /></button>" },
          "v-dialog": { template: "<div><slot /></div>" },
          "v-card": { template: "<div><slot /></div>" },
        },
      },
    })

    expect(wrapper.text()).not.toContain("Ada invited you to join")

    await flushPromises()

    expect(fetchUserByIdMock).toHaveBeenCalledWith("owner-1")
    expect(wrapper.text()).toContain("Ada invited you to join")
  })
})
