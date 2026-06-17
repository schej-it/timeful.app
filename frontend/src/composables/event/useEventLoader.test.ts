// @vitest-environment happy-dom

import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { useEventLoader } from "./useEventLoader"

const { getMock, fetchEventFromPathMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  fetchEventFromPathMock: vi.fn(),
}))

vi.mock("@/utils", () => ({
  get: getMock,
  getRenderedWeekStart: vi.fn(),
  processEvent: vi.fn(),
}))

vi.mock("./eventTransportBoundary", () => ({
  fetchEventFromPath: fetchEventFromPathMock,
}))

describe("useEventLoader", () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
    getMock.mockReset()
    fetchEventFromPathMock.mockReset()
    getMock.mockResolvedValue({ longId: "evt.long" })
    fetchEventFromPathMock.mockResolvedValue({
      _id: "evt.long",
      type: "specificDates",
      responses: {},
    })
  })

  it("does not reuse whitespace-only stored guest names when loading events", async () => {
    globalThis.localStorage.setItem("evt.long.guestName", "   ")

    const loader = useEventLoader({
      eventId: ref("evt.long"),
      weekOffset: ref(0),
      authUser: computed(() => null),
    })

    await loader.refreshEvent()

    expect(fetchEventFromPathMock).toHaveBeenCalledWith("/events/evtlong")
  })
})
