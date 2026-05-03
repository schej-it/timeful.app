// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { mountScheduleOverlap } from "./scheduleOverlapTestUtils"

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    smAndDown: { value: false },
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

describe("ScheduleOverlap", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          text: () => Promise.resolve("{}"),
        })
      )
    )
  })

  it("renders overnight split calendar events without comparing Temporal.Duration via valueOf", () => {
    expect(() => mountScheduleOverlap()).not.toThrow()
  })

  it("renders the extracted timed grid child for timed events", () => {
    const wrapper = mountScheduleOverlap()

    expect(wrapper.findComponent({ name: "ScheduleOverlapTimeGrid" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "ScheduleOverlapDaysOnlyGrid" }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: "ScheduleOverlapSidebar" }).exists()).toBe(true)
  })
})
