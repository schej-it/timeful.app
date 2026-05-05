// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import { eventTypes } from "@/constants"
import SignUp from "./SignUp.vue"

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

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: showErrorMock,
  }),
}))

describe("SignUp route normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects group events to the canonical group route", async () => {
    getMock.mockResolvedValue({
      _id: "group-1",
      type: eventTypes.GROUP,
      isSignUpForm: false,
    })

    shallowMount(SignUp, {
      props: {
        signUpId: "group-1",
        fromSignIn: true,
        initialTimezone: {
          value: "Asia/Kathmandu",
          label: "Kathmandu",
          gmtString: "GMT+5:45",
          offset: "PT5H45M",
        },
        contactsPayload: {
          name: "Draft",
        },
      },
      global: {
        stubs: {
          Event: true,
        },
      },
    })

    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith({
      name: "group",
      params: {
        groupId: "group-1",
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

  it("redirects non-sign-up events to the canonical event route", async () => {
    getMock.mockResolvedValue({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      isSignUpForm: false,
    })

    shallowMount(SignUp, {
      props: {
        signUpId: "evt-1",
        fromSignIn: true,
        editingMode: true,
        initialTimezone: {
          value: "Asia/Kathmandu",
          label: "Kathmandu",
          gmtString: "GMT+5:45",
          offset: "PT5H45M",
        },
        contactsPayload: {
          name: "Draft",
        },
      },
      global: {
        stubs: {
          Event: true,
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
        editingMode: "true",
        contactsPayload: JSON.stringify({
          name: "Draft",
        }),
      },
    })
  })
})
