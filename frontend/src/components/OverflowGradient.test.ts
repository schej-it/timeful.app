// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import OverflowGradient from "./OverflowGradient.vue"

class ResizeObserverStub {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe = vi.fn()
  disconnect = vi.fn()
}

class MutationObserverStub {
  callback: MutationCallback

  constructor(callback: MutationCallback) {
    this.callback = callback
  }

  observe = vi.fn()
  disconnect = vi.fn()
}

const resizeObservers: ResizeObserverStub[] = []
const mutationObservers: MutationObserverStub[] = []

const setScrollMetrics = (
  element: HTMLElement,
  metrics: {
    scrollHeight: number
    clientHeight: number
    scrollTop?: number
  }
) => {
  Object.defineProperties(element, {
    scrollHeight: {
      configurable: true,
      value: metrics.scrollHeight,
    },
    clientHeight: {
      configurable: true,
      value: metrics.clientHeight,
    },
    scrollTop: {
      configurable: true,
      writable: true,
      value: metrics.scrollTop ?? 0,
    },
  })
}

describe("OverflowGradient", () => {
  beforeEach(() => {
    resizeObservers.length = 0
    mutationObservers.length = 0
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn((callback: ResizeObserverCallback) => {
        const observer = new ResizeObserverStub(callback)
        resizeObservers.push(observer)
        return observer
      })
    )
    vi.stubGlobal(
      "MutationObserver",
      vi.fn((callback: MutationCallback) => {
        const observer = new MutationObserverStub(callback)
        mutationObservers.push(observer)
        return observer
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("recomputes the mask when the scroll container resizes after mount", async () => {
    const container = document.createElement("div")
    setScrollMetrics(container, {
      scrollHeight: 120,
      clientHeight: 100,
    })

    const wrapper = mount(OverflowGradient, {
      props: {
        scrollContainer: container,
        showArrow: false,
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-icon": true,
        },
      },
    })

    expect(resizeObservers).toHaveLength(1)
    resizeObservers[0].callback([], resizeObservers[0] as unknown as ResizeObserver)
    await nextTick()

    expect(wrapper.find("div").exists()).toBe(true)

    setScrollMetrics(container, {
      scrollHeight: 100,
      clientHeight: 100,
    })
    resizeObservers[0].callback([], resizeObservers[0] as unknown as ResizeObserver)
    await nextTick()

    expect(wrapper.find("div").exists()).toBe(false)
  })

  it("recomputes the mask when list content changes without resizing the container box", async () => {
    const container = document.createElement("div")
    setScrollMetrics(container, {
      scrollHeight: 100,
      clientHeight: 100,
    })

    const wrapper = mount(OverflowGradient, {
      props: {
        scrollContainer: container,
        showArrow: false,
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-icon": true,
        },
      },
    })

    expect(mutationObservers).toHaveLength(1)
    expect(wrapper.find("div").exists()).toBe(false)

    setScrollMetrics(container, {
      scrollHeight: 140,
      clientHeight: 100,
    })
    mutationObservers[0].callback([], mutationObservers[0] as unknown as MutationObserver)
    await nextTick()

    expect(wrapper.find("div").exists()).toBe(true)
  })
})
