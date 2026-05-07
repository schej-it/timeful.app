// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { epochMs } from "@/test/regressionHarness"
import type * as UtilsModule from "@/utils"
import { eventTypes } from "@/constants"
import Group from "./Group.vue"

const {
  routerReplaceMock,
  getMock,
  showErrorMock,
} = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  getMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    get: getMock,
  }
})

vi.mock("vue-router", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    authUser: { value: { _id: "user-1", email: "ada@example.com" } },
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: showErrorMock,
  }),
}))

describe("Group route normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects non-group events to the canonical event route after decode", async () => {
    getMock.mockResolvedValue({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [epochMs("2026-05-01T09:00:00Z")],
      duration: 1,
      responses: {
        "user-1": {
          availability: [epochMs("2026-05-01T09:00:00Z")],
        },
      },
    })

    shallowMount(Group, {
      props: {
        groupId: "evt-1",
        fromSignIn: true,
        initialTimezone: {
          value: "Asia/Kathmandu",
          label: "Kathmandu",
          gmtString: "GMT+5:45",
          offset: Temporal.Duration.from("PT5H45M"),
        },
        contactsPayload: {
          name: "Draft",
        },
      },
      global: {
        stubs: {
          Event: true,
          AccessDenied: true,
          NotSignedIn: true,
        },
      },
    })

    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith({
      name: "event",
      params: {
        eventId: "evt-1",
      },
      query: {
        initialTimezone: JSON.stringify({
          value: "Asia/Kathmandu",
          label: "Kathmandu",
          gmtString: "GMT+5:45",
          offset: "PT5H45M",
        }),
        fromSignIn: "true",
        contactsPayload: JSON.stringify({
          name: "Draft",
        }),
      },
    })
  })
})
