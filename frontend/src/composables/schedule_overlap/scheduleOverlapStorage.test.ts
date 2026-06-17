// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  appendGuestIdentityQuery,
  getGuestNameStorageKey,
  getGuestOwnershipCollectionStorageKey,
  getGuestOwnershipStorageKey,
  getSelectedGuestOwnership,
  readGuestOwnershipCollectionForEvent,
  readGuestName,
  readShowBestTimesPreference,
  removeGuestOwnershipRecord,
  selectGuestOwnershipRecord,
  upsertGuestOwnershipRecord,
  writeGuestName,
  writeGuestOwnershipCollection,
  writeShowBestTimesPreference,
} from "./scheduleOverlapStorage"

globalThis.localStorage = createLocalStorageMock()

describe("scheduleOverlapStorage", () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it("uses the shared guest-name and collection key contract", () => {
    expect(getGuestNameStorageKey("evt-123")).toBe("evt-123.guestName")
    expect(getGuestOwnershipStorageKey("evt-123")).toBe("evt-123.guestOwnership")
    expect(getGuestOwnershipCollectionStorageKey("evt-123")).toBe(
      "evt-123.guestOwnershipCollection"
    )
  })

  it("migrates legacy single guest ownership into the collection on first access", () => {
    localStorage.setItem("evt-123.guestName", "  Ada  ")
    localStorage.setItem(
      "evt-123.guestOwnership",
      JSON.stringify({
        name: "  Ada  ",
        guestId: "guest_1",
        guestEditToken: "secret",
        guestEditPolicy: "protected",
        guestOwnershipMode: "token",
      })
    )

    const collection = readGuestOwnershipCollectionForEvent("evt-123")

    expect(collection?.records).toHaveLength(1)
    expect(collection?.selectedLookupKey).toBe("guest_1")
    expect(getSelectedGuestOwnership(collection)?.guestEditToken).toBe("secret")
    expect(getSelectedGuestOwnership(collection)?.name).toBe("Ada")
  })

  it("ignores legacy empty guest names during collection migration", () => {
    localStorage.setItem("evt-123.guestName", "")

    expect(readGuestOwnershipCollectionForEvent("evt-123")).toBeUndefined()
  })

  it("ignores legacy whitespace-only guest names during collection migration", () => {
    localStorage.setItem("evt-123.guestName", "   ")

    expect(readGuestOwnershipCollectionForEvent("evt-123")).toBeUndefined()
  })

  it("adds multiple owned guest identities without overwriting earlier ones", () => {
    const first = upsertGuestOwnershipRecord(undefined, {
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret-1",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    const second = upsertGuestOwnershipRecord(first, {
      name: "Grace",
      guestId: "guest_2",
      guestEditToken: "secret-2",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })

    expect(second.records.map((record) => record.lookupKey).sort()).toEqual([
      "guest_1",
      "guest_2",
    ])
  })

  it("updates only the targeted identity on rename", () => {
    const first = upsertGuestOwnershipRecord(undefined, {
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret-1",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    const second = upsertGuestOwnershipRecord(first, {
      name: "Grace",
      guestId: "guest_2",
      guestEditToken: "secret-2",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    const selected = selectGuestOwnershipRecord(second, "guest_1")
    const renamed = upsertGuestOwnershipRecord(selected, {
      name: "Ada Lovelace",
      guestId: "guest_1",
      guestEditToken: "secret-1",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })

    expect(
      renamed.records.find((record) => record.lookupKey === "guest_1")?.name
    ).toBe("Ada Lovelace")
    expect(
      renamed.records.find((record) => record.lookupKey === "guest_2")?.name
    ).toBe("Grace")
  })

  it("removes only the targeted identity on delete", () => {
    const first = upsertGuestOwnershipRecord(undefined, {
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret-1",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })
    const second = upsertGuestOwnershipRecord(first, {
      name: "Grace",
      guestId: "guest_2",
      guestEditToken: "secret-2",
      guestEditPolicy: "protected",
      guestOwnershipMode: "token",
    })

    const updated = removeGuestOwnershipRecord(second, "guest_1")

    expect(updated?.records.map((record) => record.lookupKey)).toEqual([
      "guest_2",
    ])
  })

  it("reads and writes guest-name ownership through the shared boundary", () => {
    writeGuestName("evt-123.guestName", "  Ada  ")

    expect(readGuestName("evt-123.guestName")).toBe("Ada")
  })

  it("clears guest-name ownership when the trimmed value is blank", () => {
    writeGuestName("evt-123.guestName", "Ada")
    writeGuestName("evt-123.guestName", "   ")

    expect(readGuestName("evt-123.guestName")).toBeUndefined()
  })

  it("persists collection-backed guest ownership records", () => {
    writeGuestOwnershipCollection("evt-123.guestOwnershipCollection", {
      version: 1,
      selectedLookupKey: "guest_1",
      records: [
        {
          name: "Ada",
          lookupKey: "guest_1",
          guestId: "guest_1",
          guestEditToken: "secret",
          guestEditPolicy: "protected",
          guestOwnershipMode: "token",
          lastUsedAt: 1,
        },
      ],
    })

    expect(getSelectedGuestOwnership(readGuestOwnershipCollectionForEvent("evt-123"))).toMatchObject({
      name: "Ada",
      guestId: "guest_1",
      guestEditToken: "secret",
    })
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
        name: "  Ada  ",
      })
    ).toBe("/events/evt-123/response?guestName=Ada")
  })

  it("does not build guest-name query strings from blank legacy names", () => {
    expect(
      appendGuestIdentityQuery("/events/evt-123/response", {
        name: "   ",
      })
    ).toBe("/events/evt-123/response")
  })

  it("does not create ownership records from blank guest names", () => {
    const collection = upsertGuestOwnershipRecord(undefined, {
      name: "   ",
      guestOwnershipMode: "legacy",
    })

    expect(collection.records).toEqual([])
  })

  it("reads and writes the best-times preference through the shared boundary", () => {
    expect(readShowBestTimesPreference()).toBe(false)

    writeShowBestTimesPreference(true)
    expect(readShowBestTimesPreference()).toBe(true)

    writeShowBestTimesPreference(false)
    expect(readShowBestTimesPreference()).toBe(false)
  })
})
