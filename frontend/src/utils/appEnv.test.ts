import { describe, expect, it } from "vitest"
import { getAppEnvironment } from "./appEnv"

describe("appEnv", () => {
  it("defaults to development when VITE_APP_ENV is missing or blank", () => {
    expect(getAppEnvironment()).toBe("development")
    expect(getAppEnvironment({})).toBe("development")
    expect(getAppEnvironment({ VITE_APP_ENV: "   " })).toBe("development")
  })

  it("recognizes staging and production", () => {
    expect(getAppEnvironment({ VITE_APP_ENV: "staging" })).toBe("staging")
    expect(getAppEnvironment({ VITE_APP_ENV: "production" })).toBe("production")
  })

  it("normalizes case and surrounding whitespace", () => {
    expect(getAppEnvironment({ VITE_APP_ENV: " StAgInG " })).toBe("staging")
    expect(getAppEnvironment({ VITE_APP_ENV: " PRODUCTION " })).toBe("production")
  })

  it("falls back to development for unsupported values", () => {
    expect(getAppEnvironment({ VITE_APP_ENV: "prod" })).toBe("development")
    expect(getAppEnvironment({ VITE_APP_ENV: "local" })).toBe("development")
  })
})
