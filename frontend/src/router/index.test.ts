// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"

const getMock = vi.fn()

describe("router sign-in availability guard", () => {
  beforeEach(() => {
    vi.resetModules()
    getMock.mockReset()
  })

  it("redirects signed-out users away from sign-in routes when sign-in is disabled", async () => {
    getMock.mockRejectedValue(new Error("not signed in"))

    vi.doMock("@/utils", () => ({
      get: getMock,
    }))
    vi.doMock("@/utils/signInAvailability", () => ({
      signInEnabled: false,
    }))

    const { default: router } = await import("./index")

    await router.push("/")
    await router.isReady()
    await router.push("/sign-in")

    expect(router.currentRoute.value.name).toBe("landing")
  })

  it("redirects signed-in users away from auth callback routes when sign-in is disabled", async () => {
    getMock.mockResolvedValue({})

    vi.doMock("@/utils", () => ({
      get: getMock,
    }))
    vi.doMock("@/utils/signInAvailability", () => ({
      signInEnabled: false,
    }))

    const { default: router } = await import("./index")

    await router.push("/")
    await router.isReady()
    await router.push("/auth")

    expect(router.currentRoute.value.name).toBe("home")
  })
})
