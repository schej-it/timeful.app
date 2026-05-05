import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { timeTypes } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import { getLocale, getTimeOptions, userPrefers12h } from "./browserDatePreferences"

describe("browserDatePreferences", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("prefers navigator.languages over navigator.language", () => {
    vi.stubGlobal("navigator", {
      languages: ["fr-CA", "en-US"],
      language: "en-GB",
    })

    expect(getLocale()).toBe("fr-CA")
  })

  it("falls back to navigator.language when languages is empty", () => {
    vi.stubGlobal("navigator", {
      languages: [],
      language: "de-DE",
    })

    expect(getLocale()).toBe("de-DE")
  })

  it("derives 12-hour preferences from the browser locale when no override is stored", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-US"],
      language: "en-US",
    })
    vi.stubGlobal("localStorage", createLocalStorageMock())

    expect(userPrefers12h()).toBe(true)

    const options = getTimeOptions()
    expect(options[0]).toEqual({ text: "12 am", time: 0, value: 0 })
    expect(options[12]).toEqual({ text: "12 pm", time: 12, value: 12 })
    expect(options[24]).toEqual({ text: "12 am", time: 0, value: 24 })
  })

  it("lets the saved timeType override browser locale preferences", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-US"],
      language: "en-US",
    })
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timeType: timeTypes.HOUR24,
      })
    )

    const options = getTimeOptions()

    expect(options[0]).toEqual({ text: "0:00", time: 0, value: 0 })
    expect(options[23]).toEqual({ text: "23:00", time: 23, value: 23 })
    expect(options[24]).toEqual({ text: "0:00", time: 0, value: 24 })
  })
})
