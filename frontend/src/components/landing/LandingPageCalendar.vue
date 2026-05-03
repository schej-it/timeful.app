<template>
  <v-card class="tw-m-4 tw-rounded-lg lg:tw-w-[34rem]">
    <!-- Brendan W was here -->
    <div class="-tw-ml-3 sm:tw-ml-0">
      <ScheduleOverlap
        ref="scheduleOverlap"
        :event="event"
        :sample-calendar-events-by-day="calendarEventsByDay"
        calendar-only
        :interactable="false"
        :show-snackbar="false"
        :always-show-calendar-events="true"
        animate-timeslot-always
        :show-hint-text="false"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { Temporal } from "temporal-polyfill"
import ScheduleOverlap from "@/components/schedule_overlap/ScheduleOverlap.vue"
import {
  processTimeBlocks,
} from "@/utils"
import { UTC } from "@/constants"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { CalendarEventsByDay } from "@/composables/schedule_overlap/types"

interface ScheduleOverlapRef {
  startEditing: () => void
  stopEditing: () => void
  setAvailabilityAutomatically: () => void
}

const { isPhone } = useDisplayHelpers()

const dates = ref<Temporal.ZonedDateTime[]>([
  Temporal.Now.zonedDateTimeISO(UTC).subtract({ days: 1 }).with({ hour: 9 }),
  Temporal.Now.zonedDateTimeISO(UTC).with({ hour: 9 }),
  Temporal.Now.zonedDateTimeISO(UTC).add({ days: 1 }).with({ hour: 9 }),
])
const responses = ref<Record<string, unknown>>({})
const calendarEventsByDay = ref<CalendarEventsByDay>([])

const scheduleOverlap = ref<ScheduleOverlapRef | null>(null)

const duration = computed(() => Temporal.Duration.from({hours: (isPhone.value ? 6 : 8) }))
const startTime = computed(() => {
  const zdt = dates.value[0]
  return zdt
})

const endTime = computed(() => (startTime.value.add(duration.value)))

const event = computed(() => ({
  dates: dates.value,
  duration: duration.value,
  startTime: startTime.value.toPlainTime(),
  endTime: endTime.value.toPlainTime(),
}))

// Helper function to create Temporal.ZonedDateTime with specific time
const makeZDTWithTime = (date: Temporal.ZonedDateTime, hour: number): Temporal.ZonedDateTime => {
  return date.with({ hour: hour })
}

const getCalendarEventsByDay = () => {
  const [day1, day2, day3] = dates.value
  const events = [
    {
      startDate: makeZDTWithTime(day1, 9),
      endDate: makeZDTWithTime(day1, 10),
      summary: "Coffee with Jen",
    },
    {
      startDate: makeZDTWithTime(day2, 11),
      endDate: makeZDTWithTime(day2, 14),
      summary: "Karaoke with friends",
    },
    {
      startDate: makeZDTWithTime(day3, 13),
      endDate: makeZDTWithTime(day3, 17),
      summary: "Study session",
    },
  ]

  if (!isPhone.value) {
    events.push({
      startDate: makeZDTWithTime(day3, 20.5),
      endDate: makeZDTWithTime(day3, 22),
      summary: "Hackathon meeting",
    })
  }

  calendarEventsByDay.value = processTimeBlocks(
    dates.value,
    duration.value,
    events
  )
}

const getResponses = () => {
  const [day1, day2, day3] = dates.value
  
  const makeSlot = (instant: Temporal.ZonedDateTime, hour: number): Temporal.ZonedDateTime => {
    return instant.with({ hour })
  }
  
  responses.value = {
    "62828fec1bc681fa020632f2": {
      user: { _id: "1", name: "1" },
      availability: [
        makeSlot(day1, 10), makeSlot(day1, 10.5), makeSlot(day1, 11), makeSlot(day1, 11.5),
        makeSlot(day1, 12), makeSlot(day1, 12.5), makeSlot(day1, 13), makeSlot(day1, 14.5),
        makeSlot(day1, 15), makeSlot(day1, 15.5), makeSlot(day1, 16), makeSlot(day1, 16.5),
        makeSlot(day1, 17), makeSlot(day1, 17.5), makeSlot(day1, 18), makeSlot(day1, 18.5),
        makeSlot(day1, 19), makeSlot(day1, 20.5), makeSlot(day1, 21), makeSlot(day1, 21.5),

        makeSlot(day2, 9), makeSlot(day2, 9.5), makeSlot(day2, 14), makeSlot(day2, 14.5),
        makeSlot(day2, 15), makeSlot(day2, 15.5), makeSlot(day2, 16), makeSlot(day2, 16.5),
        makeSlot(day2, 17), makeSlot(day2, 17.5), makeSlot(day2, 18), makeSlot(day2, 18.5),
        makeSlot(day2, 19), makeSlot(day2, 19.5), makeSlot(day2, 20), makeSlot(day2, 21.5),

        makeSlot(day3, 12.5), makeSlot(day3, 17), makeSlot(day3, 19.5),
      ],
    },
    "628292fe6e12d2baa9c01395": {
      user: { _id: "2", name: "2" },
      availability: [
        makeSlot(day1, 14), makeSlot(day1, 14.5), makeSlot(day1, 15), makeSlot(day1, 15.5),
        makeSlot(day1, 16), makeSlot(day1, 16.5), makeSlot(day1, 17), makeSlot(day1, 17.5),
        makeSlot(day1, 18), makeSlot(day1, 18.5), makeSlot(day1, 19), makeSlot(day1, 19.5),
        makeSlot(day1, 20), makeSlot(day1, 20.5), makeSlot(day1, 21), makeSlot(day1, 21.5),

        makeSlot(day2, 9), makeSlot(day2, 9.5), makeSlot(day2, 10), makeSlot(day2, 10.5),
        makeSlot(day2, 16), makeSlot(day2, 16.5), makeSlot(day2, 17), makeSlot(day2, 17.5),
        makeSlot(day2, 18), makeSlot(day2, 18.5), makeSlot(day2, 19), makeSlot(day2, 19.5),
        makeSlot(day2, 20), makeSlot(day2, 20.5), makeSlot(day2, 21), makeSlot(day2, 21.5),

        makeSlot(day3, 9), makeSlot(day3, 9.5), makeSlot(day3, 10), makeSlot(day3, 12.5),
        makeSlot(day3, 17), makeSlot(day3, 18), makeSlot(day3, 18.5), makeSlot(day3, 19),
        makeSlot(day3, 19.5), makeSlot(day3, 20),
      ],
    },
    "628208870df4418ff4213757": {
      user: { _id: "3", name: "3" },
      availability: [
        makeSlot(day1, 11), makeSlot(day1, 11.5), makeSlot(day1, 12), makeSlot(day1, 12.5),
        makeSlot(day1, 13), makeSlot(day1, 13.5), makeSlot(day1, 14), makeSlot(day1, 14.5),
        makeSlot(day1, 15), makeSlot(day1, 15.5), makeSlot(day1, 16), makeSlot(day1, 16.5),
        makeSlot(day1, 20), makeSlot(day1, 20.5), makeSlot(day1, 21), makeSlot(day1, 21.5),

        makeSlot(day2, 9), makeSlot(day2, 9.5), makeSlot(day2, 10), makeSlot(day2, 10.5),
        makeSlot(day2, 19), makeSlot(day2, 19.5), makeSlot(day2, 20), makeSlot(day2, 20.5),
        makeSlot(day2, 21), makeSlot(day2, 21.5),

        makeSlot(day3, 9), makeSlot(day3, 9.5), makeSlot(day3, 10), makeSlot(day3, 10.5),
        makeSlot(day3, 11), makeSlot(day3, 11.5), makeSlot(day3, 12), makeSlot(day3, 12.5),
        makeSlot(day3, 17), makeSlot(day3, 17.5), makeSlot(day3, 18), makeSlot(day3, 18.5),
        makeSlot(day3, 19), makeSlot(day3, 19.5), makeSlot(day3, 20),
      ],
    },
  }

  // Add duplicate slots with 15-minute offset
  for (const id of Object.keys(responses.value)) {
    const fixedAvailability: Temporal.ZonedDateTime[] = []
    const userEntry = responses.value[id] as { availability: Temporal.ZonedDateTime[] }
    for (const instant of userEntry.availability) {
      fixedAvailability.push(instant)
      const slotPlus15 = instant.add({ minutes: 15 })
      fixedAvailability.push(slotPlus15)
    }
    userEntry.availability = fixedAvailability
  }
}

const reset = () => {
  responses.value = {}
  calendarEventsByDay.value = []
}

const playAnimation = () => {
  reset()
  scheduleOverlap.value?.startEditing()
  setTimeout(() => {
    getCalendarEventsByDay()
    getResponses()
    setTimeout(() => {
      scheduleOverlap.value?.setAvailabilityAutomatically()
      setTimeout(() => {
        scheduleOverlap.value?.stopEditing()
      }, 2000)
    }, 500)
  }, 200)
}

defineExpose({ playAnimation })

onMounted(() => {
  playAnimation()
})
</script>
