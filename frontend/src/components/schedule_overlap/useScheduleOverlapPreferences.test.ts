// @vitest-environment happy-dom

import { computed } from "vue"
import { beforeEach, describe, expect, it } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { useScheduleOverlapPreferences } from "./useScheduleOverlapPreferences"

describe("useScheduleOverlapPreferences", () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it("clears the in-memory guest name when the trimmed input is blank", () => {
    const preferences = useScheduleOverlapPreferences({
      eventId: computed(() => "evt-1"),
    })

    preferences.setGuestName("   ")

    expect(preferences.guestName.value).toBeUndefined()
    expect(localStorage.getItem("evt-1.guestName")).toBeNull()
  })

  it("trims guest names before keeping them in local state", () => {
    const preferences = useScheduleOverlapPreferences({
      eventId: computed(() => "evt-1"),
    })

    preferences.setGuestName("  Ada  ")

    expect(preferences.guestName.value).toBe("Ada")
    expect(localStorage.getItem("evt-1.guestName")).toBe("Ada")
  })

  it("does not keep whitespace-only ownership names in local state", () => {
    const preferences = useScheduleOverlapPreferences({
      eventId: computed(() => "evt-1"),
    })

    preferences.setGuestName("Ada")
    preferences.setGuestOwnership({
      name: "   ",
      guestId: "guest_1",
      guestEditToken: "secret",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })

    expect(preferences.guestName.value).toBe("Ada")
    expect(preferences.guestOwnership.value).toMatchObject({
      guestId: "guest_1",
      guestEditToken: "secret",
    })
  })

  it("trims ownership names before exposing them in local state", () => {
    const preferences = useScheduleOverlapPreferences({
      eventId: computed(() => "evt-1"),
    })

    preferences.setGuestOwnership({
      name: "  Ada  ",
      guestOwnershipMode: "legacy",
    })

    expect(preferences.guestName.value).toBe("Ada")
    expect(preferences.guestOwnership.value?.name).toBe("Ada")
  })
})
