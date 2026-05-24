// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils"
import { defineComponent, nextTick, ref } from "vue"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import type { ScheduleOverlapSignUpBlock } from "@/composables/schedule_overlap/types"
import SignUpBlocksList from "./SignUpBlocksList.vue"

const isPhone = ref(false)

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone,
  }),
}))

const SignUpBlockStub = defineComponent({
  name: "SignUpBlock",
  props: {
    signUpBlock: {
      type: Object,
      required: true,
    },
  },
  template: "<div :data-id='signUpBlock._id' class='sign-up-block-stub' />",
})

const OverflowGradientStub = defineComponent({
  name: "OverflowGradient",
  props: {
    scrollContainer: {
      type: Object,
      default: null,
    },
    showArrow: {
      type: Boolean,
      default: true,
    },
  },
  template: "<div class='overflow-gradient-stub' />",
})

const buildSignUpBlock = (id: string): ScheduleOverlapSignUpBlock => ({
  _id: id,
  name: `Slot ${id}`,
  capacity: 1,
  responses: [],
  startDate: Temporal.ZonedDateTime.from(`2026-01-01T09:00:00+00:00[UTC]`),
  endDate: Temporal.ZonedDateTime.from(`2026-01-01T10:00:00+00:00[UTC]`),
  hoursOffset: Temporal.Duration.from({ hours: 0 }),
  hoursLength: Temporal.Duration.from({ hours: 1 }),
})

const baseProps = {
  signUpBlocks: [
    buildSignUpBlock("slot-1"),
    buildSignUpBlock("slot-2"),
  ],
  signUpBlocksToAdd: [],
  isEditing: false,
  isOwner: true,
  alreadyResponded: false,
}

describe("SignUpBlocksList", () => {
  beforeEach(() => {
    isPhone.value = false
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("applies the desktop max-height floor from viewport position", async () => {
    const wrapper = mount(SignUpBlocksList, {
      props: baseProps,
      global: {
        stubs: {
          SignUpBlock: SignUpBlockStub,
          OverflowGradient: OverflowGradientStub,
        },
      },
    })

    const root = wrapper.get(".tw-flex.tw-flex-col")
    Object.defineProperty(root.element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: 700,
      }),
    })

    window.dispatchEvent(new Event("resize"))
    await nextTick()

    expect(root.attributes("style")).toContain("max-height: 400px;")
  })

  it("updates the desktop max-height when the viewport changes", async () => {
    const wrapper = mount(SignUpBlocksList, {
      props: baseProps,
      global: {
        stubs: {
          SignUpBlock: SignUpBlockStub,
          OverflowGradient: OverflowGradientStub,
        },
      },
    })

    const root = wrapper.get(".tw-flex.tw-flex-col")
    Object.defineProperty(root.element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: 100,
      }),
    })

    window.dispatchEvent(new Event("resize"))
    await nextTick()

    expect(root.attributes("style")).toContain("max-height: 768px;")
  })

  it("scrolls the list to the requested sign-up block through the exposed API", () => {
    const wrapper = mount(SignUpBlocksList, {
      props: baseProps,
      attachTo: document.body,
      global: {
        stubs: {
          SignUpBlock: SignUpBlockStub,
          OverflowGradient: OverflowGradientStub,
        },
      },
    })

    const scrollView = wrapper.get(".tw-overflow-y-auto.tw-overflow-x-hidden")
      .element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(scrollView, "scrollTo", {
      configurable: true,
      value: scrollTo,
    })
    Object.defineProperty(scrollView, "offsetTop", {
      configurable: true,
      value: 20,
    })

    const targetBlock = wrapper.get("[data-id='slot-2']").element as HTMLElement
    Object.defineProperty(targetBlock, "offsetTop", {
      configurable: true,
      value: 180,
    })

    ;(wrapper.vm as { scrollToSignUpBlock: (id: string) => void }).scrollToSignUpBlock(
      "slot-2"
    )

    expect(scrollTo).toHaveBeenCalledWith({ top: 160, behavior: "smooth" })
  })

  it("does not scroll when the requested block is missing", () => {
    const wrapper = mount(SignUpBlocksList, {
      props: baseProps,
      global: {
        stubs: {
          SignUpBlock: SignUpBlockStub,
          OverflowGradient: OverflowGradientStub,
        },
      },
    })

    const scrollView = wrapper.get(".tw-overflow-y-auto.tw-overflow-x-hidden")
      .element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(scrollView, "scrollTo", {
      configurable: true,
      value: scrollTo,
    })

    ;(wrapper.vm as { scrollToSignUpBlock: (id: string) => void }).scrollToSignUpBlock(
      "missing-slot"
    )

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it("only renders the overflow gradient on desktop after mount", async () => {
    isPhone.value = true

    const wrapper = mount(SignUpBlocksList, {
      props: baseProps,
      global: {
        stubs: {
          SignUpBlock: SignUpBlockStub,
          OverflowGradient: OverflowGradientStub,
        },
      },
    })

    await nextTick()

    expect(wrapper.findComponent(OverflowGradientStub).exists()).toBe(false)

    isPhone.value = false
    await nextTick()

    expect(wrapper.findComponent(OverflowGradientStub).exists()).toBe(true)
    expect(wrapper.getComponent(OverflowGradientStub).props("showArrow")).toBe(false)
  })
})
