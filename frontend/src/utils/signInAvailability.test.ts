import { describe, expect, it } from "vitest"
import { isSignInEnabled } from "./signInAvailability"

describe("signInAvailability", () => {
  it("enables sign-in by default", () => {
    expect(isSignInEnabled()).toBe(true)
    expect(isSignInEnabled({})).toBe(true)
    expect(isSignInEnabled({ VITE_ENABLE_SIGN_IN: "   " })).toBe(true)
  })

  it("disables sign-in when the env flag is false", () => {
    expect(isSignInEnabled({ VITE_ENABLE_SIGN_IN: "false" })).toBe(false)
    expect(isSignInEnabled({ VITE_ENABLE_SIGN_IN: " FALSE " })).toBe(false)
  })

  it("keeps sign-in enabled for other values", () => {
    expect(isSignInEnabled({ VITE_ENABLE_SIGN_IN: "true" })).toBe(true)
    expect(isSignInEnabled({ VITE_ENABLE_SIGN_IN: "0" })).toBe(true)
  })
})
