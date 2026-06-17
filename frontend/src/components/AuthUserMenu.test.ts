// @vitest-environment happy-dom

/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { passThroughStub } from "@/test/componentStubs"
import AuthUserMenu from "./AuthUserMenu.vue"

const { postMock, replaceMock, resetMock, setAuthUserMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  replaceMock: vi.fn(),
  resetMock: vi.fn(),
  setAuthUserMock: vi.fn(),
}))

const authUser = ref({
  _id: "user-1",
  firstName: "Grace",
  lastName: "Hopper",
})
const isPhoneValue = ref(false)

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("vue-router", () => ({
  useRoute: () => ({
    name: "event",
  }),
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser,
    setAuthUser: setAuthUserMock,
  }),
}))

vi.mock("@/utils", () => ({
  post: postMock,
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    reset: resetMock,
  },
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: isPhoneValue,
  }),
}))

const VMenuStub = defineComponent({
  name: "VMenu",
  template: `
    <div>
      <slot name="activator" :props="{}" />
      <slot />
    </div>
  `,
})

const VBtnStub = defineComponent({
  name: "VBtn",
  emits: ["click"],
  template: "<button @click=\"$emit('click')\"><slot /></button>",
})

const VListStub = defineComponent({
  name: "VList",
  props: {
    density: {
      type: String,
      default: undefined,
    },
  },
  template: "<div><slot /></div>",
})

const VListItemStub = defineComponent({
  name: "VListItem",
  props: {
    id: {
      type: String,
      default: undefined,
    },
  },
  emits: ["click"],
  template: "<button :id=\"id\" @click=\"$emit('click')\"><slot /></button>",
})

const mountMenu = () =>
  mount(AuthUserMenu, {
    global: {
      stubs: {
        TeamsNotReadyDialog: true,
        UserAvatarContent: true,
        "v-avatar": passThroughStub,
        "v-btn": VBtnStub,
        "v-divider": passThroughStub,
        "v-icon": true,
        "v-list": VListStub,
        "v-list-item": VListItemStub,
        "v-list-item-title": passThroughStub,
        "v-menu": VMenuStub,
      },
    },
  })

describe("AuthUserMenu", () => {
  beforeEach(() => {
    isPhoneValue.value = false
    postMock.mockReset()
    replaceMock.mockReset()
    resetMock.mockReset()
    setAuthUserMock.mockReset()
    postMock.mockResolvedValue(undefined)
    vi.spyOn(window.location, "reload").mockImplementation(() => undefined)
  })

  it("maps phone and non-phone state to explicit list densities", () => {
    const desktopWrapper = mountMenu()
    expect(desktopWrapper.getComponent(VListStub).props("density")).toBe("default")

    isPhoneValue.value = true

    const phoneWrapper = mountMenu()
    expect(phoneWrapper.getComponent(VListStub).props("density")).toBe("compact")
  })

  it("keeps settings and sign-out wired to the same handlers", async () => {
    const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => undefined)
    const wrapper = mountMenu()

    await wrapper.get("#settings-btn").trigger("click")
    expect(replaceMock).toHaveBeenCalledWith({ name: "settings" })

    await wrapper.get("#sign-out-btn").trigger("click")
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith("/auth/sign-out")
    expect(setAuthUserMock).toHaveBeenCalledWith(null)
    expect(resetMock).toHaveBeenCalled()
    expect(reloadSpy).toHaveBeenCalled()
  })
})
