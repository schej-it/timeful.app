// @vitest-environment happy-dom

import { computed, ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { availabilityTypes } from "@/constants"
import { states } from "./types"
import { useScheduleOverlapUI } from "./useScheduleOverlapUI"

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

function createUi() {
  const curTimeslot = ref({ row: 2, col: 3 })
  const curTimeslotAvailability = ref<Record<string, boolean>>({ "user-1": true })
  const timeslotSelected = ref(false)
  const endDrag = vi.fn()

  const ui = useScheduleOverlapUI({
    isPhone: ref(false),
    isSignUp: computed(() => false),
    isGroup: computed(() => false),
    showHintText: ref(false),
    state: ref(states.EDIT_AVAILABILITY),
    showBestTimes: ref(false),
    defaultState: computed(() => states.HEATMAP),
    allowDrag: computed(() => true),
    availabilityType: ref(availabilityTypes.AVAILABLE),
    parsedResponses: computed(() => ({})),
    curTimeslot,
    endDrag,
    timeslotSelected,
    curTimeslotAvailability,
    respondents: computed(() => [{ _id: "user-1" }]),
    curGuestId: ref(""),
    guestName: computed(() => undefined),
    ownedGuestResponseLookupKeys: computed(() => new Set<string>()),
    guestResponseLookupKey: computed(() => undefined),
    guestAddedAvailability: computed(() => false),
  })

  return {
    ui,
    curTimeslot,
    endDrag,
  }
}

describe("useScheduleOverlapUI deselectRespondents", () => {
  it("keeps the current timeslot when the release click lands inside the drag section", () => {
    const { ui, curTimeslot, endDrag } = createUi()
    const dragSection = document.createElement("div")
    dragSection.id = "drag-section"
    const inner = document.createElement("div")
    dragSection.appendChild(inner)
    document.body.appendChild(dragSection)

    const event = new MouseEvent("click", { bubbles: true })
    Object.defineProperty(event, "target", {
      configurable: true,
      value: inner,
    })
    ui.deselectRespondents(event)

    expect(curTimeslot.value).toEqual({ row: 2, col: 3 })
    expect(endDrag).not.toHaveBeenCalled()

    dragSection.remove()
  })
})
