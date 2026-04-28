import type { components } from "./api"

type Schemas = components["schemas"]

// Server model types (from generated swagger types)
// `stripeCustomerId` and `isPremium` are emitted by the backend but missing from the OpenAPI spec.
export type User = Schemas["models.User"] & {
  stripeCustomerId?: string
  isPremium?: boolean | null
}
// `startTime`/`endTime` are synthesized client-side by `processEvent`.
export type Event = Schemas["models.Event"] & {
  startTime?: number
  endTime?: number
}
export type Folder = Schemas["models.Folder"]
export type Response = Schemas["models.Response"]
export type SignUpBlock = Schemas["models.SignUpBlock"]
export type SignUpResponse = Schemas["models.SignUpResponse"]
export type CalendarAccount = Schemas["models.CalendarAccount"]
export type CalendarEvent = Schemas["models.CalendarEvent"]
export type CalendarOptions = Schemas["models.CalendarOptions"]
export type SubCalendar = Schemas["models.SubCalendar"]
export type Location = Schemas["models.Location"]
export type Remindee = Schemas["models.Remindee"]
export type Attendee = Schemas["models.Attendee"]
export type BufferTimeOptions = Schemas["models.BufferTimeOptions"]
export type WorkingHoursOptions = Schemas["models.WorkingHoursOptions"]

// App-local types
export interface NewDialogOptions {
  show: boolean
  contactsPayload: Record<string, unknown>
  openNewGroup: boolean
  eventOnly: boolean
  folderId: string | null
}

export type { components, paths, operations } from "./api"
