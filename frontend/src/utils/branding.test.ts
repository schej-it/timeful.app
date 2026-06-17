import { describe, expect, it } from "vitest"
import { isFormerlyKnownAsSchejEnabled } from "./branding"

describe("branding", () => {
  it("shows the formerly-known-as note by default", () => {
    expect(isFormerlyKnownAsSchejEnabled()).toBe(true)
    expect(isFormerlyKnownAsSchejEnabled({})).toBe(true)
  })

  it("hides the formerly-known-as note when the env flag is false", () => {
    expect(
      isFormerlyKnownAsSchejEnabled({
        VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ: "false",
      })
    ).toBe(false)
    expect(
      isFormerlyKnownAsSchejEnabled({
        VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ: " FALSE ",
      })
    ).toBe(false)
  })

  it("keeps the formerly-known-as note visible for other values", () => {
    expect(
      isFormerlyKnownAsSchejEnabled({
        VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ: "true",
      })
    ).toBe(true)
    expect(
      isFormerlyKnownAsSchejEnabled({
        VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ: "0",
      })
    ).toBe(true)
  })
})
