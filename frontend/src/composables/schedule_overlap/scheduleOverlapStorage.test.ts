// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  appendGuestIdentityQuery,
  getGuestNameStorageKey,
  getGuestOwnershipStorageKey,
  getGuestResponseLookupKey,
  readGuestOwnership,
  readGuestName,
  readShowBestTimesPreference,
  writeGuestOwnership,
  writeGuestName,
  writeShowBestTimesPreference,
} from "./scheduleOverlapStorage"

globalThis.localStorage = createLocalStorageMock()

describe("scheduleOverlapStorage", () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it("uses the shared guest-name key contract", () => {
    expect(getGuestNameStorageKey("evt-123")).toBe("evt-123.guestName")
    expect(getGuestOwnershipStorageKey("evt-123")).toBe("evt-123.guestOwnership")
  })

  it("reads and writes guest-name ownership through the shared boundary", () => {
    writeGuestName("evt-123.guestName", "Ada")

    expect(readGuestName("evt-123.guestName")).toBe("Ada")
  })

  it("persists opaque guest ownership separately from the display name", () => {
    writeGuestOwnership("evt-123.guestOwnership", {
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })

    expect(readGuestOwnership("evt-123.guestOwnership")).toEqual({
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    expect(
      getGuestResponseLookupKey(readGuestOwnership("evt-123.guestOwnership"))
    ).toBe("guest_1")
  })

  it("builds guest identity query strings with token ownership first and legacy fallback second", () => {
    expect(
      appendGuestIdentityQuery("/events/evt-123/response", {
        name: "Ada",
        guestId: "guest_1",
      })
    ).toBe("/events/evt-123/response?guestId=guest_1")

    expect(
      appendGuestIdentityQuery("/events/evt-123/response", {
        name: "Ada",
      })
    ).toBe("/events/evt-123/response?guestName=Ada")

    expect(
      appendGuestIdentityQuery("/events/evt-123/response", undefined, "Grace Hopper")
    ).toBe("/events/evt-123/response?guestName=Grace%20Hopper")
  })

  it("reads and writes the best-times preference through the shared boundary", () => {
    expect(readShowBestTimesPreference()).toBe(false)

    writeShowBestTimesPreference(true)
    expect(readShowBestTimesPreference()).toBe(true)

    writeShowBestTimesPreference(false)
    expect(readShowBestTimesPreference()).toBe(false)
  })
})
