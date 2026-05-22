import { describe, expect, it } from "vitest"
import { guestUserId } from "@/constants"
import {
  canEditAvailabilityAsCurrentViewer,
  canEditEventMetadata,
  getRealOwnerId,
  isAnonymousOwnerId,
  isSignedInOwner,
} from "./eventOwnership"

describe("event ownership semantics", () => {
  it("treats empty owner ids as anonymous at the shared helper boundary", () => {
    const anonymousEvent = { ownerId: "" }
    const signedInUser = { _id: "user-1" }

    expect(isAnonymousOwnerId("")).toBe(true)
    expect(getRealOwnerId(anonymousEvent)).toBeUndefined()
    expect(canEditAvailabilityAsCurrentViewer(anonymousEvent, null)).toBe(true)
    expect(canEditEventMetadata(anonymousEvent, signedInUser)).toBe(true)
  })

  it("keeps guest sentinel events anonymous while allowing legacy metadata editing", () => {
    const guestEvent = { ownerId: guestUserId }
    const guestUser = { _id: guestUserId }

    expect(isAnonymousOwnerId(guestUserId)).toBe(true)
    expect(isSignedInOwner(guestEvent, guestUser)).toBe(false)
    expect(canEditEventMetadata(guestEvent, null)).toBe(true)
  })
})
