import { computed, reactive, ref, watch, type ComputedRef } from "vue"
import { calendarTypes } from "@/constants"
import { zdtSetHas } from "@/utils"
import { Temporal } from "temporal-polyfill"
import type {
  ParsedResponses,
  ScheduleOverlapEvent,
} from "@/composables/schedule_overlap/types"
import type { User } from "@/types"

interface UseRespondentsListStateOptions {
  event: ScheduleOverlapEvent
  respondents: ComputedRef<User[]>
  curRespondents: ComputedRef<string[]>
  curTimeslotAvailability: ComputedRef<Record<string, boolean>>
  parsedResponses: ComputedRef<ParsedResponses>
  curDate: ComputedRef<Temporal.ZonedDateTime | undefined>
  hideIfNeeded: ComputedRef<boolean>
  isGroup: ComputedRef<boolean>
  attendees: ComputedRef<{ email: string; declined?: boolean }[] | undefined>
  isOwner: ComputedRef<boolean>
  isPhone: ComputedRef<boolean>
}

export function useRespondentsListState(
  opts: UseRespondentsListStateOptions
) {
  const deleteAvailabilityDialog = ref(false)
  const userToDelete = ref<User | null>(null)
  let oldCurRespondents: string[] = []
  const curRespondentsAddedTime = reactive<Record<string, Temporal.ZonedDateTime>>(
    {}
  )

  const curRespondentsSet = computed(() => new Set(opts.curRespondents.value))

  const allowExportCsv = computed(() => {
    if (opts.isGroup.value || opts.isPhone.value) {
      return false
    }

    return opts.event.blindAvailabilityEnabled
      ? opts.isOwner.value && opts.respondents.value.length > 0
      : opts.respondents.value.length > 0
  })

  const isCurTimeslotSelected = computed(
    () => opts.curDate.value != null
  )

  const numUsersAvailable = computed(() => {
    let numUsers = 0
    for (const key in opts.curTimeslotAvailability.value) {
      if (opts.curTimeslotAvailability.value[key]) {
        numUsers++
      }
    }
    return numUsers
  })

  const numCurRespondentsAvailable = computed(() => {
    let numUsers = 0
    for (const key in opts.curTimeslotAvailability.value) {
      if (
        opts.curTimeslotAvailability.value[key] &&
        curRespondentsSet.value.has(key)
      ) {
        numUsers++
      }
    }
    return numUsers
  })

  const pendingUsers = computed(() => {
    if (!opts.isGroup.value) {
      return []
    }

    const respondentEmailsSet = new Set(
      opts.respondents.value.map((respondent) => respondent.email?.toLowerCase() ?? "")
    )

    return (opts.attendees.value ?? []).filter((attendee) => {
      if (
        !attendee.declined &&
        !respondentEmailsSet.has(attendee.email.toLowerCase())
      ) {
        return true
      }

      return false
    })
  })

  function respondentIfNeeded(id: string) {
    if (!opts.curDate.value || opts.hideIfNeeded.value) {
      return false
    }

    const response = opts.parsedResponses.value[id]
    return Boolean(
      response.ifNeeded && zdtSetHas(response.ifNeeded, opts.curDate.value)
    )
  }

  const showIfNeededStar = computed(() => {
    if (opts.hideIfNeeded.value) {
      return false
    }

    for (const user of opts.respondents.value) {
      if (respondentIfNeeded(user._id ?? "")) {
        return true
      }
    }

    return false
  })

  const orderedRespondents = computed(() => {
    const ordered = [...opts.respondents.value]
    ordered.sort((a, b) => {
      const aId = a._id ?? ""
      const bId = b._id ?? ""
      if (curRespondentsSet.value.has(aId) && curRespondentsSet.value.has(bId)) {
        return Temporal.ZonedDateTime.compare(
          curRespondentsAddedTime[aId],
          curRespondentsAddedTime[bId]
        )
      }
      if (curRespondentsSet.value.has(aId)) {
        return -1
      }
      if (curRespondentsSet.value.has(bId)) {
        return 1
      }
      return (a.firstName ?? "").localeCompare(b.firstName ?? "")
    })
    return ordered
  })

  function respondentClass(id: string) {
    const classes: string[] = []
    if (!curRespondentsSet.value.has(id) && opts.curRespondents.value.length > 0) {
      classes.push("tw-text-gray")
    }

    if (
      (curRespondentsSet.value.has(id) || opts.curRespondents.value.length === 0) &&
      respondentIfNeeded(id)
    ) {
      classes.push("tw-bg-yellow")
    }

    if (!opts.curTimeslotAvailability.value[id]) {
      classes.push("tw-line-through")
      classes.push("tw-text-gray")
    }

    return classes
  }

  function respondentSelected(id: string) {
    return curRespondentsSet.value.has(id)
  }

  function isGuest(user: User) {
    return user._id === user.firstName
  }

  function shouldUseRichAvatar(user: User) {
    const calendarType = "calendarType" in user ? user.calendarType : undefined
    return (
      !isGuest(user) &&
      ((user.picture?.length ?? 0) > 0 ||
        calendarType === calendarTypes.APPLE ||
        calendarType === calendarTypes.OUTLOOK)
    )
  }

  function showDeleteAvailabilityDialog(user: User) {
    deleteAvailabilityDialog.value = true
    userToDelete.value = user
  }

  watch(
    opts.curRespondents,
    (nextRespondents) => {
      const oldSet = new Set(oldCurRespondents)
      const newSet = new Set(nextRespondents)
      const addedRespondents = nextRespondents.filter((id) => !oldSet.has(id))
      const removedRespondents = oldCurRespondents.filter((id) => !newSet.has(id))

      for (const id of addedRespondents) {
        curRespondentsAddedTime[id] = Temporal.Now.zonedDateTimeISO()
      }
      for (const id of removedRespondents) {
        Reflect.deleteProperty(curRespondentsAddedTime, id)
      }

      oldCurRespondents = [...nextRespondents]
    },
    { deep: true }
  )

  return {
    allowExportCsv,
    isCurTimeslotSelected,
    numUsersAvailable,
    numCurRespondentsAvailable,
    pendingUsers,
    showIfNeededStar,
    orderedRespondents,
    deleteAvailabilityDialog,
    userToDelete,
    respondentClass,
    respondentIfNeeded,
    respondentSelected,
    shouldUseRichAvatar,
    isGuest,
    showDeleteAvailabilityDialog,
  }
}
