import { onBeforeUnmount, watch, type Ref } from "vue"

const POPULATE_DELAY_MS = 200
const AUTOFILL_DELAY_MS = 500
const STOP_EDITING_DELAY_MS = 2000

export interface LandingPageCalendarAnimationActions {
  reset: () => void
  startEditing: () => void
  populateCalendar: () => void
  setAvailabilityAutomatically: () => void
  stopEditing: () => void
}

export interface UseLandingPageCalendarAnimationOptions {
  replayToken: Ref<number>
  actions: LandingPageCalendarAnimationActions
}

export const useLandingPageCalendarAnimation = ({
  replayToken,
  actions,
}: UseLandingPageCalendarAnimationOptions): void => {
  let timeouts: ReturnType<typeof setTimeout>[] = []

  const clearAnimationTimers = () => {
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeouts = []
  }

  const scheduleTimeout = (callback: () => void, delayMs: number) => {
    const timeout = setTimeout(() => {
      timeouts = timeouts.filter(activeTimeout => activeTimeout !== timeout)
      callback()
    }, delayMs)

    timeouts.push(timeout)
  }

  const restartAnimation = () => {
    clearAnimationTimers()
    actions.reset()
    actions.startEditing()

    scheduleTimeout(() => {
      actions.populateCalendar()

      scheduleTimeout(() => {
        actions.setAvailabilityAutomatically()

        scheduleTimeout(() => {
          actions.stopEditing()
        }, STOP_EDITING_DELAY_MS)
      }, AUTOFILL_DELAY_MS)
    }, POPULATE_DELAY_MS)
  }

  watch(replayToken, restartAnimation, { immediate: true })
  onBeforeUnmount(clearAnimationTimers)
}
