import { describe, expect, it } from "vitest"
import type { RouteLocationNormalizedLoaded } from "vue-router"
import { Temporal } from "temporal-polyfill"
import {
  getEventRouteProps,
  getHomeRouteProps,
  getSignUpRouteProps,
  serializeRouteContactsPayload,
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
        offset: Temporal.Duration.from("PT5H45M"),
      },
      contactsPayload: {
        name: "Draft",
        startTime: Temporal.PlainTime.from("09:00"),
        endTime: Temporal.PlainTime.from("17:00"),
        selectedDays: [Temporal.PlainDate.from("2026-05-01")],
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

  it("rejects object-shaped query payloads and falls back to encoded boundary defaults", () => {
    const props = getHomeRouteProps(makeRoute({}, {
      contactsPayload: {
        name: "Existing object",
        startTime: Temporal.PlainTime.from("09:00"),
        notificationsEnabled: false,
      },
      openNewGroup: true,
    }))

    expect(props.contactsPayload).toEqual({})
    expect(props.openNewGroup).toBe(true)
  })

  it("serializes canonical drafts without widening internal runtime shapes", () => {
    const serialized = serializeRouteContactsPayload({
      name: "Draft",
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      selectedDays: [Temporal.PlainDate.from("2026-05-01")],
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT5H45M"),
      },
    })

    const props = getHomeRouteProps(makeRoute({}, { contactsPayload: serialized }))

    expect(props.contactsPayload).toEqual({
      name: "Draft",
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      selectedDays: [Temporal.PlainDate.from("2026-05-01")],
      timezone: {
        value: "Asia/Kathmandu",
        label: "Kathmandu",
        gmtString: "GMT+5:45",
        offset: Temporal.Duration.from("PT5H45M"),
      },
    })
  })

  it("ignores legacy restore payloads carried only in params", () => {
    const props = getEventRouteProps(makeRoute({
      eventId: "evt-1",
      fromSignIn: "true",
      editingMode: "true",
      linkApple: "true",
      initialTimezone: JSON.stringify({
        value: "Asia/Kathmandu",
      }),
      contactsPayload: JSON.stringify({
        name: "legacy-only",
      }),
    }))

    expect(props).toEqual({
      eventId: "evt-1",
      fromSignIn: false,
      editingMode: false,
      linkApple: false,
      initialTimezone: undefined,
      contactsPayload: {},
    })
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
      initialTimezone: undefined,
      contactsPayload: {},
    })
  })

  it("does not leak partial Temporal-bearing object payloads from route query", () => {
    const props = getEventRouteProps(makeRoute({
      eventId: "evt-1",
    }, {
      initialTimezone: {
        value: "Asia/Kathmandu",
        offset: "PT5H45M",
      },
      contactsPayload: {
        name: "Draft",
        startTime: 9,
        selectedDays: [Temporal.PlainDate.from("2026-05-01")],
        timezone: {
          value: "Asia/Kathmandu",
          offset: Temporal.Duration.from("PT5H45M"),
        },
      },
    }))

    expect(props).toEqual({
      eventId: "evt-1",
      fromSignIn: false,
      editingMode: false,
      linkApple: false,
      initialTimezone: undefined,
      contactsPayload: {},
    })
  })
})
