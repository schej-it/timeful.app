import { describe, expect, it } from "vitest"
import { areAdsEnabled } from "./ads"

describe("ads", () => {
  it("enables ads by default when no env override is provided", () => {
    expect(areAdsEnabled()).toBe(true)
    expect(areAdsEnabled({})).toBe(true)
  })

  it("disables ads when VITE_ENABLE_ADS is false", () => {
    expect(areAdsEnabled({ VITE_ENABLE_ADS: "false" })).toBe(false)
    expect(areAdsEnabled({ VITE_ENABLE_ADS: " FALSE " })).toBe(false)
  })

  it("keeps ads enabled for other values", () => {
    expect(areAdsEnabled({ VITE_ENABLE_ADS: "true" })).toBe(true)
    expect(areAdsEnabled({ VITE_ENABLE_ADS: "0" })).toBe(true)
  })
})
