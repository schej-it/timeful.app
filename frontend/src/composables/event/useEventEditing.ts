import { ref, nextTick, type Ref, type ComputedRef } from "vue"
import { signInGoogle, signInOutlook } from "@/utils"
import { authTypes, calendarTypes } from "@/constants"
import isWebview from "is-ua-webview"
import type { Event, User } from "@/types"
import { useMainStore } from "@/stores/main"
import type { ScheduleOverlapInstance } from "./types"

interface SignInGoogleOptions {
  state?: Record<string, unknown> | null
  selectAccount?: boolean
  requestCalendarPermission?: boolean
  requestContactsPermission?: boolean
  loginHint?: string
}

interface SignInOutlookOptions {
  state?: Record<string, unknown> | null
  selectAccount?: boolean
  requestCalendarPermission?: boolean
}

export interface UseEventEditingOptions {
  event: Ref<Event | null>
  eventId: Ref<string>
  authUser: ComputedRef<User | null>
  scheduleOverlapRef: Ref<ScheduleOverlapInstance | null>
  isSignUp: ComputedRef<boolean>
  isGroup: ComputedRef<boolean>
  userHasResponded: ComputedRef<boolean>
  curGuestId: Ref<string>
  addingAvailabilityAsGuest: Ref<boolean>
  calendarPermissionGranted: Ref<boolean>
  refreshEvent: () => Promise<void>
}

export function useEventEditing(opts: UseEventEditingOptions) {
  const mainStore = useMainStore()

  const editEventDialog = ref(false)
  const choiceDialog = ref(false)
  const webviewDialog = ref(false)
  const guestDialog = ref(false)
  const pagesNotVisitedDialog = ref(false)
  const availabilityBtnOpacity = ref(1)

  function addAvailability() {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    const ev = opts.event.value

    if (ev?.daysOnly) {
      so.startEditing()
      return
    }

    if ((opts.authUser.value && opts.calendarPermissionGranted.value) || opts.userHasResponded.value) {
      so.startEditing()
      if (!opts.userHasResponded.value && !opts.isSignUp.value) {
        so.setAvailabilityAutomatically()
      }
    } else {
      choiceDialog.value = true
    }
  }

  function addAvailabilityAsGuest() {
    opts.addingAvailabilityAsGuest.value = true
    setAvailabilityManually()
  }

  function cancelEditing() {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    if (!opts.isSignUp.value) so.resetCurUserAvailability()
    else so.resetSignUpForm()
    so.stopEditing()
    opts.curGuestId.value = ""
    opts.addingAvailabilityAsGuest.value = false
  }

  function copyLink() {
    const ev = opts.event.value
    if (!ev) return
    void navigator.clipboard.writeText(
      `${window.location.origin}/e/${ev.shortId ?? ev._id ?? ""}`
    )
    mainStore.showInfo("Link copied to clipboard!")
  }

  async function deleteAvailability() {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    if (!opts.authUser.value || opts.addingAvailabilityAsGuest.value) {
      if (opts.curGuestId.value) {
        await so.deleteAvailability(opts.curGuestId.value)
        opts.curGuestId.value = ""
      }
    } else {
      await so.deleteAvailability()
    }
    mainStore.showInfo(opts.isGroup.value ? "Left group!" : "Availability deleted!")
    so.stopEditing()
  }

  function editEvent() {
    editEventDialog.value = true
  }

  async function saveChanges(ignorePagesNotVisited = false) {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    if (
      !opts.userHasResponded.value &&
      opts.curGuestId.value.length === 0 &&
      !so.pageHasChanged &&
      !ignorePagesNotVisited &&
      so.hasPages
    ) {
      pagesNotVisitedDialog.value = true
      return
    }
    if (!opts.authUser.value || opts.addingAvailabilityAsGuest.value) {
      if (opts.curGuestId.value) {
        const ev = opts.event.value
        await saveChangesAsGuest({
          name: opts.curGuestId.value,
          email: ev?.responses?.[opts.curGuestId.value]?.email ?? "",
        })
        opts.curGuestId.value = ""
        opts.addingAvailabilityAsGuest.value = false
      } else {
        guestDialog.value = true
      }
      return
    }
    let changesPersisted = true
    if (opts.isSignUp.value) {
      changesPersisted = await so.submitNewSignUpBlocks()
    } else {
      await so.submitAvailability()
    }
    if (changesPersisted) {
      mainStore.showInfo("Changes saved!")
      so.stopEditing()
    }
  }

  async function saveChangesAsGuest(payload: { name: string; email: string }) {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    if (payload.name.length > 0) {
      await so.submitAvailability(payload)
      mainStore.showInfo("Changes saved!")
      so.resetCurUserAvailability()
      so.stopEditing()
      guestDialog.value = false
      opts.addingAvailabilityAsGuest.value = false
    }
  }

  function setAvailabilityAutomatically(calendarType: string = calendarTypes.GOOGLE) {
    if (isWebview(navigator.userAgent)) {
      webviewDialog.value = true
    } else {
      let signInGoogleParams: SignInGoogleOptions
      let signInOutlookParams: SignInOutlookOptions
      if (opts.authUser.value) {
        signInGoogleParams = {
          state: {
            type: opts.isGroup.value
              ? authTypes.GROUP_ADD_AVAILABILITY
              : authTypes.EVENT_ADD_AVAILABILITY,
            eventId: opts.eventId.value,
          },
          selectAccount: false,
          requestCalendarPermission: true,
        }
        signInOutlookParams = {
          state: {
            type: opts.isGroup.value
              ? authTypes.GROUP_ADD_AVAILABILITY
              : authTypes.EVENT_ADD_AVAILABILITY,
            eventId: opts.eventId.value,
          },
          requestCalendarPermission: true,
        }
      } else {
        signInGoogleParams = {
          state: {
            type: authTypes.EVENT_ADD_AVAILABILITY,
            eventId: opts.eventId.value,
          },
          selectAccount: true,
          requestCalendarPermission: true,
        }
        signInOutlookParams = {
          state: {
            type: authTypes.EVENT_ADD_AVAILABILITY,
            eventId: opts.eventId.value,
          },
          requestCalendarPermission: true,
        }
      }
      if (calendarType === calendarTypes.GOOGLE) signInGoogle(signInGoogleParams)
      else if (calendarType === calendarTypes.OUTLOOK) signInOutlook(signInOutlookParams)
    }
    choiceDialog.value = false
  }

  function setAvailabilityManually() {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    void nextTick(() => { so.startEditing() })
    choiceDialog.value = false
  }

  function editGuestAvailability(userId?: string) {
    const so = opts.scheduleOverlapRef.value
    if (!so) return
    const id = userId ?? so.selectedGuestRespondent ?? ""
    opts.curGuestId.value = id
    so.startEditing()
    void nextTick(() => { so.populateUserAvailability(id) })
  }

  function signInLinkApple() {
    if (isWebview(navigator.userAgent)) {
      webviewDialog.value = true
    } else {
      signInGoogle({
        state: {
          type: authTypes.EVENT_SIGN_IN_LINK_APPLE,
          eventId: opts.eventId.value,
        },
        selectAccount: true,
      })
    }
  }

  function addedAppleCalendar() {
    choiceDialog.value = false
    opts.scheduleOverlapRef.value?.startEditing()
    opts.scheduleOverlapRef.value?.setAvailabilityAutomatically()
  }

  function addedICSCalendar() {
    choiceDialog.value = false
    opts.scheduleOverlapRef.value?.startEditing()
    opts.scheduleOverlapRef.value?.setAvailabilityAutomatically()
  }

  function highlightAvailabilityBtn() {
    availabilityBtnOpacity.value = 0.1
    setTimeout(() => {
      availabilityBtnOpacity.value = 1
      setTimeout(() => {
        availabilityBtnOpacity.value = 0.1
        setTimeout(() => {
          availabilityBtnOpacity.value = 1
        }, 100)
      }, 100)
    }, 100)
  }

  function handleGuestDialogSubmit(guestPayload: { name: string; email: string }) {
    void saveChangesAsGuest(guestPayload)
  }

  return {
    editEventDialog,
    choiceDialog,
    webviewDialog,
    guestDialog,
    pagesNotVisitedDialog,
    availabilityBtnOpacity,
    addAvailability,
    addAvailabilityAsGuest,
    cancelEditing,
    copyLink,
    deleteAvailability,
    editEvent,
    saveChanges,
    saveChangesAsGuest,
    setAvailabilityAutomatically,
    setAvailabilityManually,
    editGuestAvailability,
    signInLinkApple,
    addedAppleCalendar,
    addedICSCalendar,
    highlightAvailabilityBtn,
    handleGuestDialogSubmit,
  }
}
