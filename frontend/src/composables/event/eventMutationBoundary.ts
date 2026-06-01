import type { Event, Remindee, SignUpBlock } from "@/types"
import {
  toEventDateStrings,
  toRawSignUpBlock,
  toTransportDateTimeStrings,
} from "@/types/transport"
import {
  getTimedEventTimezone,
  getTimedRecurrence,
  getTimedSlotGeneration,
  sortAndUniqueSlots,
} from "@/utils/timedEventSlots"

type EventPatchInput = Pick<
  Event,
  | "dates"
  | "timeSeed"
  | "enabledSlots"
  | "activeSlots"
  | "eventTimezone"
  | "slotGeneration"
  | "timedRecurrence"
> & {
  name?: Event["name"]
  duration?: Event["duration"]
  type?: Event["type"]
  description?: Event["description"]
  signUpBlocks?: SignUpBlock[]
  times?: Event["times"]
  remindees?: Event["remindees"] | string[]
  attendees?: string[]
  hasSpecificTimes?: Event["hasSpecificTimes"]
  notificationsEnabled?: Event["notificationsEnabled"]
  blindAvailabilityEnabled?: Event["blindAvailabilityEnabled"]
  daysOnly?: Event["daysOnly"]
  sendEmailAfterXResponses?: Event["sendEmailAfterXResponses"]
  collectEmails?: Event["collectEmails"]
  startOnMonday?: Event["startOnMonday"]
  timeIncrement?: Event["timeIncrement"]
  creatorPosthogId?: Event["creatorPosthogId"]
}

const toRemindeeEmails = (
  remindees: EventPatchInput["remindees"]
): string[] | undefined => {
  if (!remindees) return undefined

  return remindees.flatMap((remindee) => {
    if (typeof remindee === "string") {
      return remindee.length > 0 ? [remindee] : []
    }

    const email = (remindee as Remindee | undefined)?.email
    return email ? [email] : []
  })
}

export const toEventPatchPayload = (input: EventPatchInput) => ({
  enabledSlots: (() => {
    const activeSlots = sortAndUniqueSlots(input.activeSlots ?? input.times)
    const enabledSlots = sortAndUniqueSlots(input.enabledSlots)
    return toTransportDateTimeStrings(
      enabledSlots.length > 0 ? enabledSlots : activeSlots
    )
  })(),
  activeSlots: toTransportDateTimeStrings(sortAndUniqueSlots(input.activeSlots ?? input.times)),
  eventTimezone: getTimedEventTimezone(input),
  slotGeneration: (() => {
    const slotGeneration = getTimedSlotGeneration(input)
    return {
      startTimeLocal: slotGeneration.startTimeLocal.toString(),
      endTimeLocal: slotGeneration.endTimeLocal.toString(),
      timeIncrementMinutes: slotGeneration.timeIncrement.total("minutes"),
    }
  })(),
  timedRecurrence: (() => {
    const timedRecurrence = getTimedRecurrence(input)
    return {
      kind: timedRecurrence.kind,
      selectedDays: timedRecurrence.selectedDays.map((day) => day.toString()),
      selectedDaysOfWeek: timedRecurrence.selectedDaysOfWeek,
      startOnMonday: timedRecurrence.startOnMonday,
    }
  })(),
  name: input.name,
  duration: input.duration?.total("hours"),
  dates: toEventDateStrings(input),
  hasSpecificTimes: input.hasSpecificTimes,
  notificationsEnabled: input.notificationsEnabled,
  blindAvailabilityEnabled: input.blindAvailabilityEnabled,
  daysOnly: input.daysOnly,
  type: input.type,
  sendEmailAfterXResponses: input.sendEmailAfterXResponses,
  collectEmails: input.collectEmails,
  startOnMonday: input.startOnMonday,
  timeIncrement: input.timeIncrement?.total("minutes"),
  creatorPosthogId: input.creatorPosthogId,
  description: input.description,
  signUpBlocks: input.signUpBlocks?.map((block) => toRawSignUpBlock(block)),
  times: toTransportDateTimeStrings(input.times),
  remindees: toRemindeeEmails(input.remindees),
  attendees: input.attendees,
})
