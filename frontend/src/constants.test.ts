import { describe, expect, it } from "vitest"
import { serverURL } from "./constants"

describe("constants", () => {
  it("uses the same-origin api base so Vite can proxy dev requests", () => {
    expect(serverURL).toBe("/api")
  })
})
