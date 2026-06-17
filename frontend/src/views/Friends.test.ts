// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import { passThroughStub, vTextFieldStub } from "@/test/componentStubs"
import Friends from "./Friends.vue"

const pushMock = vi.fn()

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

const FriendItemStub = defineComponent({
  name: "FriendItem",
  props: {
    friend: {
      type: Object,
      required: true,
    },
  },
  emits: ["click"],
  template: `
    <button @click="$emit('click')">
      {{ friend.name }}
    </button>
  `,
})

describe("Friends", () => {
  it("uses an explicit outlined compact search field and still routes on friend click", async () => {
    pushMock.mockReset()

    const wrapper = shallowMount(Friends, {
      global: {
        stubs: {
          FriendItem: FriendItemStub,
          "v-btn": passThroughStub,
          "v-chip": passThroughStub,
          "v-container": passThroughStub,
          "v-icon": true,
          "v-scale-transition": passThroughStub,
          "v-text-field": vTextFieldStub,
        },
      },
    })

    const searchField = wrapper.getComponent(vTextFieldStub)
    expect(searchField.props("variant")).toBe("outlined")
    expect(searchField.props("density")).toBe("compact")

    await wrapper.findAll("button")[0]?.trigger("click")

    expect(pushMock).toHaveBeenCalledWith({ name: "friend-schedule" })
  })
})
