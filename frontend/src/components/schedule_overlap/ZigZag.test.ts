import { describe, expect, it } from "vitest"
import zigZagSource from "./ZigZag.vue?raw"

describe("ZigZag", () => {
  it("uses the shared event-grid line color and width", () => {
    expect(zigZagSource).toContain("var(--timeful-grid-line-color)")
    expect(zigZagSource).toContain("var(--timeful-grid-line-half-width)")
    expect(zigZagSource).not.toContain("black")
  })
})
