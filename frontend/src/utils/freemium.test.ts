import { describe, expect, it } from "vitest"
import {
  isFreemiumEnabled,
  isPremiumUser,
  viewerHasPremiumAccess,
} from "./freemium"

type PremiumProbeUser = Parameters<typeof isPremiumUser>[0]

describe("freemium", () => {
  it("keeps freemium enabled by default when no env override is provided", () => {
    expect(isFreemiumEnabled()).toBe(true)
    expect(isFreemiumEnabled({})).toBe(true)
  })

  it("disables freemium when VITE_ENABLE_FREEMIUM is false", () => {
    expect(isFreemiumEnabled({ VITE_ENABLE_FREEMIUM: "false" })).toBe(false)
    expect(isFreemiumEnabled({ VITE_ENABLE_FREEMIUM: " FALSE " })).toBe(false)
  })

  it("keeps freemium enabled for other values", () => {
    expect(isFreemiumEnabled({ VITE_ENABLE_FREEMIUM: "true" })).toBe(true)
    expect(isFreemiumEnabled({ VITE_ENABLE_FREEMIUM: "0" })).toBe(true)
  })

  it("detects actual premium users from account state", () => {
    const missingStripeCustomer: PremiumProbeUser = {
      stripeCustomerId: undefined,
      isPremium: true,
    }
    const implicitPremiumCustomer: PremiumProbeUser = {
      stripeCustomerId: "cus_123",
      isPremium: null,
    }
    const explicitNonPremiumCustomer: PremiumProbeUser = {
      stripeCustomerId: "cus_123",
      isPremium: false,
    }

    expect(isPremiumUser(null)).toBe(false)
    expect(isPremiumUser(missingStripeCustomer)).toBe(false)
    expect(isPremiumUser(implicitPremiumCustomer)).toBe(true)
    expect(isPremiumUser(explicitNonPremiumCustomer)).toBe(false)
  })

  it("bypasses frontend premium gating for signed-out users when freemium is disabled", () => {
    expect(
      viewerHasPremiumAccess(null, { VITE_ENABLE_FREEMIUM: "false" })
    ).toBe(true)
  })

  it("keeps signed-out users gated when freemium is enabled", () => {
    expect(
      viewerHasPremiumAccess(null, { VITE_ENABLE_FREEMIUM: "true" })
    ).toBe(false)
  })
})
