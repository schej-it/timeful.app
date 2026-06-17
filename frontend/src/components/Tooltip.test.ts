// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import Tooltip from "./Tooltip.vue"
import tooltipSource from "./Tooltip.vue?raw"

describe("Tooltip", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses declarative pointer listeners instead of manual DOM wiring", () => {
    expect(tooltipSource).toContain('@mouseenter="handleMouseEnter"')
    expect(tooltipSource).toContain('@mouseleave="handleMouseLeave"')
    expect(tooltipSource).toContain('@mousemove="handleMouseMove"')
    expect(tooltipSource).not.toContain("addEventListener")
    expect(tooltipSource).not.toContain("removeEventListener")
  })

  it("centralizes delayed visibility and pointer placement through the tooltip state helper", async () => {
    vi.useFakeTimers()

    const wrapper = mount(Tooltip, {
      props: {
        content: "",
      },
      slots: {
        default: "<button>Trigger</button>",
      },
    })

    const trigger = wrapper.get("div.tw-relative")

    await trigger.trigger("mouseenter")
    expect(wrapper.text()).not.toContain("Hello")

    await wrapper.setProps({ content: "Hello" })
    expect(wrapper.text()).not.toContain("Hello")

    vi.advanceTimersByTime(700)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain("Hello")

    await trigger.trigger("mousemove", { clientX: 100, clientY: 80 })

    const tooltip = wrapper.get(".tw-fixed")
    expect(tooltip.attributes("style")).toContain("left: 100px;")
    expect(tooltip.attributes("style")).toContain("top: 50px;")
    expect(tooltip.attributes("style")).toContain("translate(-50%, -50%)")

    await trigger.trigger("mouseleave")
    expect(wrapper.find(".tw-fixed").exists()).toBe(false)
  })
})
