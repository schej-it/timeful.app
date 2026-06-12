// @vitest-environment happy-dom

import { computed, nextTick, ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { createLocalStorageMock } from "@/test/localStorage"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { useOwnedTimezone } from "./useOwnedTimezone"

const MARCH_REFERENCE_DATE = Temporal.ZonedDateTime.from(
  "2026-03-15T12:00:00-04:00[America/New_York]"
)
const DECEMBER_REFERENCE_DATE = Temporal.ZonedDateTime.from(
  "2026-12-15T12:00:00-05:00[America/New_York]"
)

describe("useOwnedTimezone", () => {
  it("persists owner-updated timezone selections", () => {
    const storage = createLocalStorageMock()
    const { timezone, modified, setTimezone } = useOwnedTimezone({
      storage,
      referenceDate: computed(() => MARCH_REFERENCE_DATE),
    })

    const losAngeles = {
      value: "America/Los_Angeles",
      label: "Pacific Time",
      gmtString: "(GMT-7:00)",
      offset: Temporal.Duration.from({ hours: -7 }),
    } satisfies Timezone

    setTimezone(losAngeles)

    expect(timezone.value.value).toBe("America/Los_Angeles")
    expect(modified.value).toBe(true)
    expect(storage.getItem("timezone")).toContain("America/Los_Angeles")
  })

  it("resets back to the browser timezone and clears persistence", () => {
    const storage = createLocalStorageMock({
      timezone: JSON.stringify({
        value: "America/Los_Angeles",
        label: "Pacific Time",
        gmtString: "(GMT-7:00)",
        offset: "PT-7H",
      }),
    })
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }) as Intl.DateTimeFormat
    )

    const { timezone, modified, resetTimezone } = useOwnedTimezone({
      storage,
      referenceDate: computed(() => MARCH_REFERENCE_DATE),
    })

    resetTimezone()

    expect(timezone.value.value).toBe("America/New_York")
    expect(modified.value).toBe(false)
    expect(storage.getItem("timezone")).toBeNull()
  })

  it("uses a custom storageKey when provided", () => {
    const storage = createLocalStorageMock()
    const { timezone, modified, setTimezone } = useOwnedTimezone({
      storage,
      storageKey: "shownInTimezone_abc123",
      referenceDate: computed(() => MARCH_REFERENCE_DATE),
    })

    const losAngeles = {
      value: "America/Los_Angeles",
      label: "Pacific Time",
      gmtString: "(GMT-7:00)",
      offset: Temporal.Duration.from({ hours: -7 }),
    } satisfies Timezone

    expect(modified.value).toBe(false)

    setTimezone(losAngeles)

    expect(timezone.value.value).toBe("America/Los_Angeles")
    expect(modified.value).toBe(true)
    expect(storage.getItem("timezone")).toBeNull()
    expect(storage.getItem("shownInTimezone_abc123")).toContain("America/Los_Angeles")
  })

  it("resets a custom storageKey timezone without touching the default key", () => {
    const storage = createLocalStorageMock({
      timezone: JSON.stringify({
        value: "Europe/London",
        label: "London",
        gmtString: "(GMT+0:00)",
        offset: "PT0H",
      }),
      shownInTimezone_abc123: JSON.stringify({
        value: "America/Los_Angeles",
        label: "Pacific Time",
        gmtString: "(GMT-7:00)",
        offset: "PT-7H",
      }),
    })
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }) as Intl.DateTimeFormat
    )

    const { timezone, modified, resetTimezone } = useOwnedTimezone({
      storage,
      storageKey: "shownInTimezone_abc123",
      referenceDate: computed(() => MARCH_REFERENCE_DATE),
    })

    expect(timezone.value.value).toBe("America/Los_Angeles")
    expect(modified.value).toBe(true)

    resetTimezone()

    expect(timezone.value.value).toBe("America/New_York")
    expect(modified.value).toBe(false)
    expect(storage.getItem("shownInTimezone_abc123")).toBeNull()
    expect(storage.getItem("timezone")).toContain("Europe/London")
  })

  it("refreshes the owned timezone offset when the reference date changes", async () => {
    const storage = createLocalStorageMock()
    const referenceDate = ref(MARCH_REFERENCE_DATE)
    const { timezone, setTimezone } = useOwnedTimezone({
      storage,
      referenceDate: computed(() => referenceDate.value),
    })

    setTimezone({
      value: "America/New_York",
      label: "Eastern Time",
      gmtString: "(GMT-4:00)",
      offset: Temporal.Duration.from({ hours: -4 }),
    })

    referenceDate.value = DECEMBER_REFERENCE_DATE
    await nextTick()

    expect(timezone.value.value).toBe("America/New_York")
    expect(timezone.value.offset.total("hours")).toBe(-5)
    expect(storage.getItem("timezone")).toContain("America/New_York")
  })
})
