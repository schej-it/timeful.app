import type { RouteLocationNormalizedLoaded } from "vue-router"
import type { EventDraft } from "@/composables/event/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  parseRouteContactsPayload,
  parseRouteTimezone,
  serializeRouteContactsPayload,
  serializeRouteTimezone,
} from "@/composables/event/draftBoundary"

export { serializeRouteContactsPayload, serializeRouteTimezone }

type RouteWithRestoreState = Pick<RouteLocationNormalizedLoaded, "params" | "query">

interface EventRouteProps {
  eventId: string
  fromSignIn: boolean
  editingMode: boolean
  linkApple: boolean
  initialTimezone?: Timezone
  contactsPayload: EventDraft
}

interface GroupRouteProps {
  groupId: string
  fromSignIn: boolean
  initialTimezone?: Timezone
  contactsPayload: EventDraft
}

interface SignUpRouteProps {
  signUpId: string
  fromSignIn: boolean
  editingMode: boolean
  initialTimezone?: Timezone
  contactsPayload: EventDraft
}

interface HomeRouteProps {
  contactsPayload: EventDraft
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

export function getHomeRouteProps(route: RouteWithRestoreState): HomeRouteProps {
  return {
    contactsPayload: parseRouteContactsPayload(route.query.contactsPayload),
    openNewGroup: parseBooleanParam(route.query.openNewGroup),
  }
}

export function getEventRouteProps(route: RouteWithRestoreState): EventRouteProps {
  return {
    eventId: parseStringParam(route.params.eventId),
    fromSignIn: parseBooleanParam(route.query.fromSignIn),
    editingMode: parseBooleanParam(route.query.editingMode),
    linkApple: parseBooleanParam(route.query.linkApple),
    initialTimezone: parseRouteTimezone(route.query.initialTimezone),
    contactsPayload: parseRouteContactsPayload(route.query.contactsPayload),
  }
}

export function getGroupRouteProps(route: RouteWithRestoreState): GroupRouteProps {
  return {
    groupId: parseStringParam(route.params.groupId),
    fromSignIn: parseBooleanParam(route.query.fromSignIn),
    initialTimezone: parseRouteTimezone(route.query.initialTimezone),
    contactsPayload: parseRouteContactsPayload(route.query.contactsPayload),
  }
}

export function getSignUpRouteProps(route: RouteWithRestoreState): SignUpRouteProps {
  return {
    signUpId: parseStringParam(route.params.signUpId),
    fromSignIn: parseBooleanParam(route.query.fromSignIn),
    editingMode: parseBooleanParam(route.query.editingMode),
    initialTimezone: parseRouteTimezone(route.query.initialTimezone),
    contactsPayload: parseRouteContactsPayload(route.query.contactsPayload),
  }
}
