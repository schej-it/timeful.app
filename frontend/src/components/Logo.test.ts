// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { computed } from "vue"
import { describe, expect, it, vi } from "vitest"
import Logo from "./Logo.vue"

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: computed(() => false),
    br: vi.fn(),
  }),
}))

describe("Logo", () => {
  it("renders a fixed-width class for the timeful logo", () => {
    const wrapper = mount(Logo, {
      props: { type: "timeful" },
    })

    const image = wrapper.get("img")

    expect(image.attributes("alt")).toBe("Timeful Logo")
    expect(image.classes()).toContain("tw-w-[110px]")
  })
})
