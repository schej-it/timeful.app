import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { stubRegressionLocalStorage } from "@/test/regressionTestSetup"
import { makeAvailabilityData, zdt } from "@/test/regressionHarness"
import { ZdtMap, ZdtSet, zdtKey, zdtMapGetOrInsert, zdtSetHas } from "@/utils"
import { eventTypes } from "@/constants"
import { getNumCurRespondentsForDay } from "@/composables/schedule_overlap/useAvailabilityData"
import type { ResponsesFormatted } from "@/composables/schedule_overlap/types"

describe("Temporal collection regression boundaries", () => {
  beforeEach(() => {
    stubRegressionLocalStorage()
  })

  it("treats equal ZonedDateTime values as the same slot in availability lookups", () => {
    const availabilityData = makeAvailabilityData()
    const slot = zdt("2026-01-01T09:00:00Z")

    const columnAvailability = availabilityData.getAvailabilityForColumn(
      0,
      new ZdtSet([slot])
    )

    expect(columnAvailability.size).toBe(1)
    expect([...columnAvailability][0].toInstant().toString()).toBe(slot.toInstant().toString())
  })

  it("handles legacy manual group availability keys stored as epoch-millisecond strings", () => {
    const availabilityData = makeAvailabilityData(eventTypes.GROUP)

    expect(() =>
      availabilityData.getFetchedManualAvailabilityDow({
        "1777760423186": [zdt("2026-01-01T09:00:00Z")],
      })
    ).not.toThrow()
  })

  it("converts manual group availability through value-keyed Temporal lookups", () => {
    const availabilityData = makeAvailabilityData(eventTypes.GROUP)
    const dayKey = zdt("2026-01-01T09:00:00Z")
    const equalDayKey = Temporal.ZonedDateTime.from(dayKey.toString())
    const slot = zdt("2026-01-01T10:00:00Z")
    const equalSlot = Temporal.ZonedDateTime.from(slot.toString())

    const dowAvailability = availabilityData.getManualAvailabilityDow(
      new ZdtMap([[dayKey, new ZdtSet([slot])]])
    )
    const dowAvailabilityFromEqualKeys = availabilityData.getManualAvailabilityDow(
      new ZdtMap([[equalDayKey, new ZdtSet([equalSlot])]])
    )

    expect(Object.keys(dowAvailability)).toHaveLength(1)
    expect(dowAvailabilityFromEqualKeys).toEqual(dowAvailability)

    const [normalizedDay, normalizedSlots] = Object.entries(dowAvailability)[0]
    const [normalizedSlot] = [...normalizedSlots]
    const equalNormalizedSlot = Temporal.ZonedDateTime.from(normalizedSlot.toString())

    expect(Number(normalizedDay)).not.toBeNaN()
    expect(normalizedSlots.has(equalNormalizedSlot)).toBe(true)
  })

  it("counts days-only respondents with value-based ZonedDateTime map lookups", () => {
    const storedDay = zdt("2026-01-01T00:00:00Z")
    const queriedDay = zdt("2026-01-01T00:00:00Z")
    const responsesFormatted: ResponsesFormatted = new ZdtMap([
      [storedDay, new Set(["user-1", "user-2"])],
    ])

    expect(
      getNumCurRespondentsForDay(
        responsesFormatted,
        queriedDay,
        new Set(["user-2", "user-3"])
      )
    ).toBe(1)
  })

  it("reuses equal ZonedDateTime keys without growing value-keyed maps", () => {
    const map = new ZdtMap<ZdtSet>()
    const first = zdt("2026-01-01T09:00:00Z")
    const second = zdt("2026-01-01T09:00:00Z")

    const created = zdtMapGetOrInsert(map, first, () => new ZdtSet([first]))
    const reused = zdtMapGetOrInsert(map, second, () => new ZdtSet([second]))

    expect(reused).toBe(created)
    expect(map.size).toBe(1)
  })

  it("uses epoch-nanosecond bigint keys for equal instants across timezones", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const laDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "America/Los_Angeles"
    )

    expect(typeof zdtKey(utcDate)).toBe("bigint")
    expect(zdtKey(utcDate)).toBe(utcDate.epochNanoseconds)
    expect(zdtKey(laDate)).toBe(utcDate.epochNanoseconds)
  })

  it("deletes equal ZonedDateTime values from ZdtSet even when timezone annotations differ", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const laDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "America/Los_Angeles"
    )
    const set = new ZdtSet([utcDate])

    expect(set.has(laDate)).toBe(true)
    expect(set.delete(laDate)).toBe(true)
    expect(set.size).toBe(0)
  })

  it("checks equal ZonedDateTime values through zdtSetHas on canonical ZdtSet inputs", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const viennaDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "Europe/Vienna"
    )
    const set = new ZdtSet([utcDate])

    expect(zdtSetHas(set, viennaDate)).toBe(true)
  })

  it("updates one ZdtMap entry for equal instants across different timezones", () => {
    const utcDate = zdt("2026-01-01T09:00:00Z")
    const viennaDate = Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(
      "Europe/Vienna"
    )
    const map = new ZdtMap<string>([[utcDate, "first"]])

    map.set(viennaDate, "second")

    expect(map.size).toBe(1)
    expect(map.get(utcDate)).toBe("second")
    expect(map.get(viennaDate)).toBe("second")
  })
})
