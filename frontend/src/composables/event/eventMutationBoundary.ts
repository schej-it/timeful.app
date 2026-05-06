import type { Event, Remindee, SignUpBlock } from "@/types"
import { toEventDateStrings, toRawSignUpBlock } from "@/types/transport"

type EventPatchInput = Pick<Event, "dates" | "timeSeed"> & {
  name?: Event["name"]
  duration?: Event["duration"]
  type?: Event["type"]
  description?: Event["description"]
  signUpBlocks?: SignUpBlock[]
  times?: Event["times"]
  remindees?: Event["remindees"] | string[]
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
  name: input.name,
  duration: input.duration?.total("hours"),
  dates: toEventDateStrings(input),
  type: input.type,
  description: input.description,
  signUpBlocks: input.signUpBlocks?.map((block) => toRawSignUpBlock(block)),
  times: input.times?.map((time) => time.epochMilliseconds),
  remindees: toRemindeeEmails(input.remindees),
})
