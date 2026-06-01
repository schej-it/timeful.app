// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { epochMs } from "@/test/regressionHarness"
import type * as UtilsModule from "@/utils"
import { eventTypes, guestUserId } from "@/constants"
import Group from "./Group.vue"

const {
  routerReplaceMock,
  getMock,
  fetchUserByIdMock,
  showErrorMock,
} = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  getMock: vi.fn(),
  fetchUserByIdMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

const authUserState = ref<{ _id: string; email: string } | null>({
  _id: "user-1",
  email: "ada@example.com",
})

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
    authUser: authUserState,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: showErrorMock,
  }),
}))

vi.mock("@/utils/services/UserService", () => ({
  fetchUserById: fetchUserByIdMock,
}))

describe("Group route normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authUserState.value = { _id: "user-1", email: "ada@example.com" }
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

  it("loads the group owner before rendering the unauthenticated invite view", async () => {
    authUserState.value = null
    getMock.mockResolvedValue({
      _id: "group-1",
      type: eventTypes.GROUP,
      ownerId: "owner-1",
      name: "Weekly sync",
      attendees: [],
      dates: [epochMs("2026-05-01T09:00:00Z")],
    })
    fetchUserByIdMock.mockResolvedValue({
      _id: "owner-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    })

    const wrapper = shallowMount(Group, {
      props: {
        groupId: "group-1",
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

    const inviteView = wrapper.findComponent({ name: "NotSignedIn" })
    expect(fetchUserByIdMock).toHaveBeenCalledWith("owner-1")
    expect(inviteView.exists()).toBe(true)
    expect(inviteView.props("owner")).toEqual(
      expect.objectContaining({ firstName: "Ada", email: "ada@example.com" })
    )
  })

  it("renders anonymous-owner group routes directly into the editable event shell", async () => {
    authUserState.value = null
    getMock.mockResolvedValue({
      _id: "group-guest",
      type: eventTypes.GROUP,
      ownerId: guestUserId,
      name: "Guest-owned group",
      attendees: [],
      dates: [epochMs("2026-05-01T09:00:00Z")],
    })

    const wrapper = shallowMount(Group, {
      props: {
        groupId: "group-guest",
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

    expect(fetchUserByIdMock).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: "NotSignedIn" }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: "Event" }).exists()).toBe(true)
  })
})
