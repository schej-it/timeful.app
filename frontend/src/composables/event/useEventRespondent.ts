import { ref, type Ref, type ComputedRef } from "vue"
import { post } from "@/utils"
import type { Event, SignUpBlock, User } from "@/types"
import type { ScheduleOverlapInstance } from "./types"

interface GuestPayload { name: string; email?: string }

export interface UseEventRespondentOptions {
  event: Ref<Event | null>
  authUser: ComputedRef<User | null>
  scheduleOverlapRef: Ref<ScheduleOverlapInstance | null>
  refreshEvent: () => Promise<void>
}

export function useEventRespondent(opts: UseEventRespondentOptions) {
  const curGuestId = ref("")
  const addingAvailabilityAsGuest = ref(false)
  const currSignUpBlock = ref<SignUpBlock | null>(null)
  const signUpForSlotDialog = ref(false)

  function initiateSignUpFlow(signUpBlock: SignUpBlock) {
    currSignUpBlock.value = signUpBlock
    signUpForSlotDialog.value = true
  }

  async function signUpForBlock(guestPayload: GuestPayload) {
    const ev = opts.event.value as (Event & { _id: string }) | null
    if (!ev || !currSignUpBlock.value) return
    let payload: Record<string, unknown>
    if (opts.authUser.value) {
      payload = { guest: false, signUpBlockIds: [currSignUpBlock.value._id] }
    } else {
      payload = { guest: true, signUpBlockIds: [currSignUpBlock.value._id], ...guestPayload }
    }
    await post(`/events/${ev._id}/response`, payload)
    await opts.refreshEvent()
    opts.scheduleOverlapRef.value?.resetSignUpForm()
    signUpForSlotDialog.value = false
  }

  return {
    curGuestId,
    addingAvailabilityAsGuest,
    currSignUpBlock,
    signUpForSlotDialog,
    initiateSignUpFlow,
    signUpForBlock,
  }
}
