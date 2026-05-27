import { describe, expect, it } from "vitest"
import { hasGuestName, normalizeGuestName } from "./guestName"

describe("guestName boundary", () => {
  it("trims valid guest names", () => {
    expect(normalizeGuestName("  Ada Lovelace  ")).toBe("Ada Lovelace")
  })

  it("rejects blank guest names after trimming", () => {
    expect(normalizeGuestName("   ")).toBeUndefined()
    expect(hasGuestName("   ")).toBe(false)
  })
})
