import type { RouteLocationNormalizedLoaded } from "vue-router"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { Timezone } from "@/composables/schedule_overlap/types"

type RouteWithParams = Pick<RouteLocationNormalizedLoaded, "params">

type JsonRecord = Record<string, unknown>

interface EventRouteProps {
  eventId: string
  fromSignIn: boolean
  editingMode: boolean
  linkApple: boolean
  initialTimezone: Timezone | Record<string, never>
  contactsPayload: SerializedEventDraft
}

interface GroupRouteProps {
  groupId: string
  fromSignIn: boolean
  initialTimezone: Timezone | Record<string, never>
  contactsPayload: SerializedEventDraft
}

interface SignUpRouteProps {
  signUpId: string
  fromSignIn: boolean
  editingMode: boolean
  initialTimezone: Timezone | Record<string, never>
  contactsPayload: SerializedEventDraft
}

interface HomeRouteProps {
  contactsPayload: SerializedEventDraft
  openNewGroup: boolean
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

function parseJsonRecord<T extends object>(
  value: unknown,
  fallback: T
): T {
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

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function serializeRouteContactsPayload(
  payload: SerializedEventDraft | undefined
): string {
  return JSON.stringify(payload ?? {})
}

export function serializeRouteTimezone(
  timezone: Timezone | Record<string, unknown> | undefined
): string {
  return JSON.stringify(timezone ?? {})
}

export function getHomeRouteProps(route: RouteWithParams): HomeRouteProps {
  return {
    contactsPayload: parseJsonRecord<SerializedEventDraft>(
      route.params.contactsPayload,
      {}
    ),
    openNewGroup: parseBooleanParam(route.params.openNewGroup),
  }
}

export function getEventRouteProps(route: RouteWithParams): EventRouteProps {
  return {
    eventId: parseStringParam(route.params.eventId),
    fromSignIn: parseBooleanParam(route.params.fromSignIn),
    editingMode: parseBooleanParam(route.params.editingMode),
    linkApple: parseBooleanParam(route.params.linkApple),
    initialTimezone: parseJsonRecord<Timezone | Record<string, never>>(
      route.params.initialTimezone,
      {}
    ),
    contactsPayload: parseJsonRecord<SerializedEventDraft>(
      route.params.contactsPayload,
      {}
    ),
  }
}

export function getGroupRouteProps(route: RouteWithParams): GroupRouteProps {
  return {
    groupId: parseStringParam(route.params.groupId),
    fromSignIn: parseBooleanParam(route.params.fromSignIn),
    initialTimezone: parseJsonRecord<Timezone | Record<string, never>>(
      route.params.initialTimezone,
      {}
    ),
    contactsPayload: parseJsonRecord<SerializedEventDraft>(
      route.params.contactsPayload,
      {}
    ),
  }
}

export function getSignUpRouteProps(route: RouteWithParams): SignUpRouteProps {
  return {
    signUpId: parseStringParam(route.params.signUpId),
    fromSignIn: parseBooleanParam(route.params.fromSignIn),
    editingMode: parseBooleanParam(route.params.editingMode),
    initialTimezone: parseJsonRecord<Timezone | Record<string, never>>(
      route.params.initialTimezone,
      {}
    ),
    contactsPayload: parseJsonRecord<SerializedEventDraft>(
      route.params.contactsPayload,
      {}
    ),
  }
}
