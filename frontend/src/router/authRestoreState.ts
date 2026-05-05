import type { LocationQueryRaw, RouteLocationNormalizedLoaded } from "vue-router"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  serializeRouteContactsPayload,
  serializeRouteTimezone,
} from "./routeProps"

type RouteWithParamsAndQuery = Pick<RouteLocationNormalizedLoaded, "name" | "params" | "query">
type RouteWithQuery = Pick<RouteLocationNormalizedLoaded, "query">

export interface AuthRestoreQueryState {
  editingMode: boolean
  initialTimezone: Timezone | Record<string, never>
  contactsPayload: SerializedEventDraft
}

export interface AuthRestoreState {
  routeName: "event" | "group" | "signUp"
  routeId: string
  routeQuery: AuthRestoreQueryState
}

function getSingleParam(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function parseBooleanParam(value: unknown): boolean {
  const normalized = getSingleParam(value)
  if (typeof normalized === "boolean") return normalized
  return normalized === "true"
}

function parseStringParam(value: unknown): string {
  const normalized = getSingleParam(value)
  return typeof normalized === "string" ? normalized : ""
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonRecord<T extends object>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      return isJsonRecord(parsed) ? parsed as T : fallback
    } catch {
      return fallback
    }
  }
  return isJsonRecord(value) ? value as T : fallback
}

export function getAuthRestoreQueryState(route: RouteWithQuery): AuthRestoreQueryState {
  return {
    editingMode: parseBooleanParam(route.query.editingMode),
    initialTimezone: parseJsonRecord<Timezone | Record<string, never>>(
      route.query.initialTimezone,
      {}
    ),
    contactsPayload: parseJsonRecord<SerializedEventDraft>(
      route.query.contactsPayload,
      {}
    ),
  }
}

export function getAuthRestoreState(route: RouteWithQuery): AuthRestoreState | null {
  const eventId = parseStringParam(route.query.eventId)
  if (eventId) {
    return {
      routeName: "event",
      routeId: eventId,
      routeQuery: getAuthRestoreQueryState(route),
    }
  }

  const groupId = parseStringParam(route.query.groupId)
  if (groupId) {
    return {
      routeName: "group",
      routeId: groupId,
      routeQuery: getAuthRestoreQueryState(route),
    }
  }

  const signUpId = parseStringParam(route.query.signUpId)
  if (signUpId) {
    return {
      routeName: "signUp",
      routeId: signUpId,
      routeQuery: getAuthRestoreQueryState(route),
    }
  }

  return null
}

export function getSignInRestoreQuery(route: RouteWithParamsAndQuery): LocationQueryRaw {
  const routeQuery = getAuthRestoreQueryState(route)

  switch (route.name) {
    case "event":
      return {
        eventId: parseStringParam(route.params.eventId),
        editingMode: String(routeQuery.editingMode),
        initialTimezone: serializeRouteTimezone(routeQuery.initialTimezone),
        contactsPayload: serializeRouteContactsPayload(routeQuery.contactsPayload),
      }
    case "group":
      return {
        groupId: parseStringParam(route.params.groupId),
        initialTimezone: serializeRouteTimezone(routeQuery.initialTimezone),
        contactsPayload: serializeRouteContactsPayload(routeQuery.contactsPayload),
      }
    case "signUp":
      return {
        signUpId: parseStringParam(route.params.signUpId),
        editingMode: String(routeQuery.editingMode),
        initialTimezone: serializeRouteTimezone(routeQuery.initialTimezone),
        contactsPayload: serializeRouteContactsPayload(routeQuery.contactsPayload),
      }
    default:
      return {}
  }
}

export function getAuthRestoreRouteLocation(
  restoreState: AuthRestoreState
): {
  name: "event" | "group" | "signUp"
  params: Record<string, string>
  query: LocationQueryRaw
} {
  const query: LocationQueryRaw = {
    initialTimezone: serializeRouteTimezone(restoreState.routeQuery.initialTimezone),
    contactsPayload: serializeRouteContactsPayload(restoreState.routeQuery.contactsPayload),
  }

  if (restoreState.routeName !== "group") {
    query.editingMode = String(restoreState.routeQuery.editingMode)
  }

  switch (restoreState.routeName) {
    case "event":
      return {
        name: "event",
        params: { eventId: restoreState.routeId },
        query,
      }
    case "group":
      return {
        name: "group",
        params: { groupId: restoreState.routeId },
        query,
      }
    case "signUp":
      return {
        name: "signUp",
        params: { signUpId: restoreState.routeId },
        query,
      }
  }
}
