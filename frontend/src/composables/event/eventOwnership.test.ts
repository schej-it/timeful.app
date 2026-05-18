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
    expect(isAnonymousOwnerId("")).toBe(true)
    expect(getRealOwnerId({ ownerId: "" } as { ownerId: string })).toBeUndefined()
    expect(
      canEditAvailabilityAsCurrentViewer(
        { ownerId: "" } as { ownerId: string },
        null
      )
    ).toBe(true)
    expect(
      canEditEventMetadata(
        { ownerId: "" } as { ownerId: string },
        { _id: "user-1" } as { _id: string }
      )
    ).toBe(false)
  })

  it("keeps guest sentinel events anonymous and non-owner-editable", () => {
    expect(isAnonymousOwnerId(guestUserId)).toBe(true)
    expect(
      isSignedInOwner(
        { ownerId: guestUserId } as { ownerId: string },
        { _id: guestUserId } as { _id: string }
      )
    ).toBe(false)
  })
})
