import { vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

export const stubRegressionLocalStorage = (
  seed: Record<string, string> = {}
) => {
  vi.stubGlobal("localStorage", createLocalStorageMock(seed))
}
