// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NotSignedIn from "./NotSignedIn.vue"

const { routeState } = vi.hoisted(() => ({
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

vi.mock("is-ua-webview", () => ({
  default: vi.fn(() => false),
}))

describe("NotSignedIn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the parent-provided owner invite state", () => {
    const wrapper = shallowMount(NotSignedIn, {
      props: {
        event: {
          _id: "group-1",
          ownerId: "owner-1",
          name: "Weekly sync",
        },
        owner: {
          _id: "owner-1",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
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

    expect(wrapper.text()).toContain("Ada invited you to join")
  })
})
