import { describe, expect, it } from "vitest"
import type { RouteLocationNormalizedLoaded } from "vue-router"
import {
  getEventRouteProps,
  getHomeRouteProps,
  getSignUpRouteProps,
} from "./routeProps"

function makeRoute(
  params: Record<string, unknown>,
  query: Record<string, unknown> = {}
) {
  return {
    params: params as RouteLocationNormalizedLoaded["params"],
    query: query as RouteLocationNormalizedLoaded["query"],
  }
}

describe("route props boundary adapters", () => {
  it("parses serialized route query into normalized event props", () => {
    const props = getEventRouteProps(makeRoute({
        eventId: "evt-1",
      }, {
        fromSignIn: "true",
        editingMode: "false",
        linkApple: "true",
        initialTimezone: JSON.stringify({
          value: "Asia/Kathmandu",
          label: "Kathmandu",
          gmtString: "GMT+5:45",
          offset: "PT5H45M",
        }),
        contactsPayload: JSON.stringify({
          name: "Draft",
          startTime: 9,
          endTime: 17,
          selectedDays: ["2026-05-01"],
        }),
      }))

    expect(props).toEqual({
      eventId: "evt-1",
      fromSignIn: true,
      editingMode: false,
      linkApple: true,
      initialTimezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: "PT5H45M",
      },
      contactsPayload: {
        name: "Draft",
        startTime: 9,
        endTime: 17,
        selectedDays: ["2026-05-01"],
      },
    })
  })

  it("prefers query restore state over legacy params when both exist", () => {
    const props = getEventRouteProps(makeRoute({
        eventId: "evt-1",
        fromSignIn: "true",
        contactsPayload: JSON.stringify({
          name: "legacy",
        }),
      }, {
        fromSignIn: "false",
        contactsPayload: JSON.stringify({
          name: "query",
        }),
      }))

    expect(props.fromSignIn).toBe(false)
    expect(props.contactsPayload).toEqual({ name: "query" })
  })

  it("accepts already-decoded params without widening component props", () => {
    const contactsPayload = {
      name: "Existing object",
      notificationsEnabled: false,
    }

    const props = getHomeRouteProps(makeRoute({
      contactsPayload,
      openNewGroup: true,
    }))

    expect(props.contactsPayload).toEqual(contactsPayload)
    expect(props.openNewGroup).toBe(true)
  })

  it("falls back safely for malformed serialized objects", () => {
    const props = getSignUpRouteProps(makeRoute({
      signUpId: "signup-1",
    }, {
      fromSignIn: "true",
      editingMode: "true",
      initialTimezone: "{not-json",
      contactsPayload: "[1,2,3]",
    }))

    expect(props).toEqual({
      signUpId: "signup-1",
      fromSignIn: true,
      editingMode: true,
      initialTimezone: {},
      contactsPayload: {},
    })
  })
})
