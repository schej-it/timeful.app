// @vitest-environment happy-dom

import { computed, ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { availabilityTypes } from "@/constants"
import { COMPACT_RESPONDENTS_PANEL_WIDTH } from "@/components/schedule_overlap/layout"
import { states } from "./types"
import { useScheduleOverlapUI } from "./useScheduleOverlapUI"
import { SCHEDULE_OVERLAP_COMPACT_DESKTOP_BREAKPOINT } from "@/components/schedule_overlap/scheduleOverlapBreakpoints"

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
  const isPhone = ref(false)
  const isSignUp = ref(false)
  const curTimeslot = ref({ row: 2, col: 3 })
  const curTimeslotAvailability = ref<Record<string, boolean>>({ "user-1": true })
  const timeslotSelected = ref(false)
  const endDrag = vi.fn()

  const ui = useScheduleOverlapUI({
    isPhone,
    isSignUp: computed(() => isSignUp.value),
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
    isPhone,
    isSignUp,
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

  it("uses a responsive respondents panel width on compact desktop", () => {
    const { ui } = createUi()

    expect(ui.rightSideWidth.value).toBe(COMPACT_RESPONDENTS_PANEL_WIDTH)
  })

  it("keeps full-width mobile and fixed sign-up respondents widths", () => {
    const { ui, isPhone, isSignUp } = createUi()

    isPhone.value = true
    expect(ui.rightSideWidth.value).toBe("100%")

    isPhone.value = false
    isSignUp.value = true
    expect(ui.rightSideWidth.value).toBe("18rem")
  })

  it("uses the shared 640px breakpoint contract for compact desktop layout decisions", () => {
    expect(SCHEDULE_OVERLAP_COMPACT_DESKTOP_BREAKPOINT).toBe(640)
  })
})
