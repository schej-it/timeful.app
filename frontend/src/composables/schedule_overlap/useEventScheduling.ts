import { computed, ref, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  dateToDowDate,
  getDateInTimezone,
  getEventDateSeeds,
  processEvent,
  getRenderedWeekStart,
  put,
  type ZdtSet,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { toEventPatchPayload } from "@/composables/event/eventMutationBoundary"
import type { Event, Location } from "@/types"
import {
  HOUR_HEIGHT,
  SPLIT_GAP_HEIGHT,
  getScheduledEventFromDragRange,
  states,
  type RowCol,
  type ScheduleOverlapEvent,
  type ScheduledEvent,
  type ScheduleOverlapState,
  type TimeItem,
  type Timezone,
} from "./types"
import { UTC } from "@/constants"

export interface UseEventSchedulingOptions {
  event: Ref<ScheduleOverlapEvent>
  // TODO
  weekOffset: Ref<number>
  curTimezone: Ref<Timezone>
  state: Ref<ScheduleOverlapState>
  defaultState: ComputedRef<ScheduleOverlapState>

  // grid
  splitTimes: ComputedRef<TimeItem[][]>
  timeslotDuration: ComputedRef<Temporal.Duration>
  timeslotHeight: ComputedRef<number>
  timezoneOffset: ComputedRef<Temporal.Duration>
  isWeekly: ComputedRef<boolean>
  isGroup: ComputedRef<boolean>
  isSpecificTimes: ComputedRef<boolean>
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
  getMinMaxHoursFromTimes: (times: Temporal.ZonedDateTime[]) => {
    minHours: Temporal.PlainTime
    maxHours: Temporal.PlainTime
  }

  // drag
  dragging: Ref<boolean>
  dragStart: Ref<RowCol | null>
  dragCur: Ref<RowCol | null>

  // availability
  tempTimes: Ref<ZdtSet>
  respondents: ComputedRef<{ email?: string; firstName?: string }[]>
}

export function useEventScheduling(opts: UseEventSchedulingOptions) {
  const mainStore = useMainStore()
  const curScheduledEvent = ref<ScheduledEvent | null>(null)

  const getLocationText = (location: unknown): string => {
    if (!location || typeof location !== "object") {
      return ""
    }

    const normalizedLocation = location as Location

    return [normalizedLocation.city, normalizedLocation.state, normalizedLocation.country_name]
      .filter((value): value is string => Boolean(value))
      .join(", ")
  }

  const allowScheduleEvent = computed(() => Boolean(curScheduledEvent.value))

  const scheduledEventStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {}
    let top: number
    let height: number
    let isSecondSplit: boolean
    if (opts.dragging.value && opts.dragStart.value && opts.dragCur.value) {
      const scheduledEvent = getScheduledEventFromDragRange(
        opts.dragStart.value,
        opts.dragCur.value
      )
      if (!scheduledEvent) {
        return style
      }

      top = scheduledEvent.row
      height = scheduledEvent.numRows
      isSecondSplit = scheduledEvent.row >= opts.splitTimes.value[0].length
    } else if (curScheduledEvent.value) {
      top = curScheduledEvent.value.row
      height = curScheduledEvent.value.numRows
      isSecondSplit =
        curScheduledEvent.value.row >= opts.splitTimes.value[0].length
    } else {
      return style
    }

    if (isSecondSplit) {
      style.top = `calc(${String(top)} * ${String(
        opts.timeslotHeight.value
      )}px + ${String(SPLIT_GAP_HEIGHT)}px)`
    } else {
      style.top = `calc(${String(top)} * ${String(
        opts.timeslotHeight.value
      )}px)`
    }
    style.height = `calc(${String(height)} * ${String(
      opts.timeslotHeight.value
    )}px)`
    return style
  })

  const signUpBlockBeingDraggedStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {}
    let top = 0
    let height = 0
    if (opts.dragging.value && opts.dragStart.value && opts.dragCur.value) {
      top = opts.dragStart.value.row
      height = opts.dragCur.value.row - opts.dragStart.value.row + 1
    }
    style.top = `calc(${String(top)} * 1rem)`
    style.height = `calc(${String(height)} * 1rem)`
    return style
  })

  const scheduleEvent = () => {
    opts.state.value = states.SCHEDULE_EVENT
    posthog.capture("schedule_event_button_clicked")
  }

  const cancelScheduleEvent = () => {
    opts.state.value = opts.defaultState.value
  }

  const confirmScheduleEvent = (googleCalendar = true) => {
    if (!curScheduledEvent.value) return

    posthog.capture("schedule_event_confirmed")
    const { col, row, numRows } = curScheduledEvent.value
    let startDate = opts.getDateFromRowCol(row, col)
    if (!startDate) return
    let endDate = startDate.add({
      minutes: opts.timeslotDuration.value.total("minutes") * numRows,
    })

    if (opts.isWeekly.value || opts.isGroup.value) {
      const eventDates = getEventDateSeeds(opts.event.value)
      const renderedWeekStart = getRenderedWeekStart(
        opts.weekOffset.value,
        opts.event.value.startOnMonday
      )
      startDate = dateToDowDate(
        eventDates,
        startDate,
        opts.weekOffset.value,
        true,
        opts.event.value.startOnMonday,
        renderedWeekStart
      )
      endDate = dateToDowDate(
        eventDates,
        endDate,
        opts.weekOffset.value,
        true,
        opts.event.value.startOnMonday,
        renderedWeekStart
      )
    }

    const emails = opts.respondents.value.map((r) =>
      r.email && r.email.length > 0 ? r.email : null
    )
    const emailsString = encodeURIComponent(emails.filter(Boolean).join(","))

    const eventId = opts.event.value.shortId ?? opts.event.value._id ?? ""
    const scheduleTimezoneId = encodeURIComponent(opts.curTimezone.value.value)

    let url: string
    if (googleCalendar) {
      const start = startDate
        .toInstant()
        .toString()
        .replace(/([-:]|\.000)/g, "")
      const end = endDate
        .toInstant()
        .toString()
        .replace(/([-:]|\.000)/g, "")
      url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        opts.event.value.name ?? ""
      )}&dates=${start}/${end}&details=${encodeURIComponent(
        "\n\nThis event was scheduled with Timeful: https://timeful.app/e/"
      )}${eventId}&ctz=${scheduleTimezoneId}&add=${emailsString}`
    } else {
      url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
        opts.event.value.name ?? ""
      )}&body=${encodeURIComponent(
        "\n\nThis event was scheduled with Timeful: https://timeful.app/e/" +
          eventId
      )}&startdt=${startDate.toInstant().toString()}&enddt=${endDate
        .toInstant()
        .toString()}&location=${encodeURIComponent(
        getLocationText(opts.event.value.location)
      )}&path=/calendar/action/compose&timezone=${scheduleTimezoneId}`
    }

    window.open(url, "_blank")
    opts.state.value = opts.defaultState.value
  }

  const saveTempTimes = () => {
    const eventValue: Pick<
      Event,
      "_id" | "dates" | "timeSeed" | "times" | "duration" | "remindees"
    > = { ...opts.event.value }

    eventValue.times = [...opts.tempTimes.value].sort((a, b) =>
      Temporal.ZonedDateTime.compare(a, b)
    )

    const { minHours, maxHours } = opts.getMinMaxHoursFromTimes(
      eventValue.times
    )
    const scheduleTimezoneId = opts.curTimezone.value.value

    const eventDateInstants = getEventDateSeeds(opts.event.value).map((zdt) => {
      const plainDate = getDateInTimezone(zdt, opts.curTimezone.value).toPlainDate()
      const withTime = plainDate.toZonedDateTime({
        timeZone: scheduleTimezoneId,
        plainTime: minHours,
      })
      return withTime.withTimeZone(UTC)
    })
    eventValue.dates = eventDateInstants.map((date) => date.toPlainDate())
    eventValue.timeSeed = eventDateInstants[0]

    eventValue.duration = maxHours.since(minHours).add({ hours: 1 })

    const eventId = eventValue._id ?? ""
    void put(`/events/${eventId}`, toEventPatchPayload(eventValue))
      .then(() => {
        opts.event.value.dates = eventValue.dates
        opts.event.value.timeSeed = eventValue.timeSeed
        opts.event.value.times = eventValue.times
        opts.event.value.duration = eventValue.duration
        processEvent(opts.event.value)
        opts.state.value = opts.defaultState.value
      })
      .catch((err: unknown) => {
        mainStore.showError(typeof err === "string" ? err : String(err))
      })
  }

  return {
    curScheduledEvent,
    allowScheduleEvent,
    scheduledEventStyle,
    signUpBlockBeingDraggedStyle,
    scheduleEvent,
    cancelScheduleEvent,
    confirmScheduleEvent,
    saveTempTimes,
    HOUR_HEIGHT,
  }
}

export type UseEventSchedulingReturn = ReturnType<typeof useEventScheduling>
