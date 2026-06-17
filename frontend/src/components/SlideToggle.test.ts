// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import SlideToggle from "./SlideToggle.vue"

const options = [
  {
    text: "First",
    value: "first",
    activeClass: "active-first",
    borderClass: "border-first",
    borderColor: "#123456",
    borderStyle: { boxShadow: "0px 0px 1px #123456" },
  },
  {
    text: "Second",
    value: "second",
    activeClass: "active-second",
    borderClass: "border-second",
    borderColor: "#654321",
    borderStyle: { boxShadow: "0px 0px 1px #654321" },
  },
] as const

const mountSlideToggle = (modelValue: "first" | "second" | "missing" = "first") =>
  mount(SlideToggle, {
    props: {
      modelValue,
      options: [...options],
    },
  })

describe("SlideToggle", () => {
  it("derives the active option from modelValue changes without mirrored local state", async () => {
    const wrapper = mountSlideToggle("second")

    const tabs = wrapper.findAll(".tw-cursor-pointer")
    expect(tabs[1].classes()).toContain("active-second")

    const indicator = wrapper.get(".slide-toggle__indicator")
    expect(indicator.classes()).toContain("border-second")
    expect(indicator.element.getAttribute("style")).toContain("translateX(100%)")
    expect(indicator.element.getAttribute("style")).toContain("width: 50%")

    await wrapper.setProps({ modelValue: "first" })

    expect(tabs[0].classes()).toContain("active-first")
    expect(wrapper.get(".slide-toggle__indicator").classes()).toContain("border-first")
    expect(wrapper.get(".slide-toggle__indicator").element.getAttribute("style")).toContain(
      "translateX(0%)"
    )
  })

  it("falls back to the first option when modelValue is not present", () => {
    const wrapper = mountSlideToggle("missing")

    expect(wrapper.findAll(".tw-cursor-pointer")[0].classes()).toContain("active-first")
    expect(wrapper.get(".slide-toggle__indicator").element.getAttribute("style")).toContain(
      "translateX(0%)"
    )
  })

  it("keeps emitting the clicked option value", async () => {
    const wrapper = mountSlideToggle("first")

    await wrapper.findAll(".tw-cursor-pointer")[1].trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([[options[1].value]])
  })
})
