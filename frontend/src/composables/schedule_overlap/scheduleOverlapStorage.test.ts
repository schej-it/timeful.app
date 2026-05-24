// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  getGuestNameStorageKey,
  readGuestName,
  readShowBestTimesPreference,
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
  })

  it("reads and writes guest-name ownership through the shared boundary", () => {
    writeGuestName("evt-123.guestName", "Ada")

    expect(readGuestName("evt-123.guestName")).toBe("Ada")
  })

  it("reads and writes the best-times preference through the shared boundary", () => {
    expect(readShowBestTimesPreference()).toBe(false)

    writeShowBestTimesPreference(true)
    expect(readShowBestTimesPreference()).toBe(true)

    writeShowBestTimesPreference(false)
    expect(readShowBestTimesPreference()).toBe(false)
  })
})
