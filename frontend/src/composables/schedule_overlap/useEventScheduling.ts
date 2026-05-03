import { computed, ref, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  dateToDowDate,
  getFixedOffsetTimeZoneId,
  getRenderedWeekStart,
  put,
  type ZdtSet,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import {
  HOUR_HEIGHT,
  SPLIT_GAP_HEIGHT,
  states,
  type EventLike,
  type RowCol,
  type ScheduledEvent,
  type ScheduleOverlapState,
  type TimeItem,
  type Timezone,
} from "./types"
import { UTC } from "@/constants"

export interface UseEventSchedulingOptions {
  event: Ref<EventLike>
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

  const allowScheduleEvent = computed(() => Boolean(curScheduledEvent.value))

  const scheduledEventStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {}
    let top: number
    let height: number
    let isSecondSplit: boolean
    if (opts.dragging.value && opts.dragStart.value && opts.dragCur.value) {
      top = opts.dragStart.value.row
      height = opts.dragCur.value.row - opts.dragStart.value.row + 1
      isSecondSplit =
        opts.dragStart.value.row >= opts.splitTimes.value[0].length
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
      const eventDates = opts.event.value.dates ?? []
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

    const eventId =
      (opts.event.value as { shortId?: string }).shortId ??
      opts.event.value._id ??
      ""
    const scheduleTimezoneId = encodeURIComponent(
      opts.curTimezone.value.value ||
        getFixedOffsetTimeZoneId(opts.curTimezone.value.offset)
    )

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
        (opts.event.value as { location?: string }).location ?? ""
      )}&path=/calendar/action/compose&timezone=${scheduleTimezoneId}`
    }

    window.open(url, "_blank")
    opts.state.value = opts.defaultState.value
  }

  const saveTempTimes = () => {
    interface EventWithTimes {
      _id?: string
      dates?: Temporal.ZonedDateTime[]
      times?: Temporal.ZonedDateTime[]
      duration?: Temporal.Duration
      remindees?: (string | { email?: string })[]
    }

    const eventValue = opts.event.value as unknown as EventWithTimes

    eventValue.times = [...opts.tempTimes.value].sort((a, b) =>
      Temporal.ZonedDateTime.compare(a, b)
    )

    const { minHours, maxHours } = opts.getMinMaxHoursFromTimes(
      eventValue.times
    )

    const eventDateInstants = (opts.event.value.dates ?? []).map((d) => {
      const zdt = d
      // Convert Duration to minutes for subtraction
      const offsetMinutes = opts.timezoneOffset.value.total("minutes")
      const adjustedZDT = zdt.subtract({ minutes: offsetMinutes })
      const plainDate = adjustedZDT.toPlainDate()
      const withTime = plainDate.toZonedDateTime({
        timeZone: UTC,
        plainTime: `${String(minHours).padStart(2, "0")}:00:00`,
      })
      return withTime
    })
    eventValue.dates = eventDateInstants

    eventValue.duration = maxHours.since(minHours).add({ hours: 1 })

    if (eventValue.remindees) {
      eventValue.remindees = eventValue.remindees
        .map((r) => (typeof r === "string" ? r : r.email ?? ""))
        .filter((s) => s.length > 0)
    }

    const eventId = eventValue._id ?? ""
    void put(`/events/${eventId}`, eventValue)
      .then(() => {
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
