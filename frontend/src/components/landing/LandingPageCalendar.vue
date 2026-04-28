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
import ScheduleOverlap from "@/components/schedule_overlap/ScheduleOverlap.vue"
import {
  getDateDayOffset,
  getDateWithTimeNum,
  dateToTimeNum,
  processTimeBlocks,
} from "@/utils"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { CalendarEventsByDay } from "@/composables/schedule_overlap/types"

interface ScheduleOverlapRef {
  startEditing: () => void
  stopEditing: () => void
  setAvailabilityAutomatically: () => void
}

const { isPhone } = useDisplayHelpers()

const dates = ref<Date[]>([
  getDateWithTimeNum(getDateDayOffset(new Date(), -1), 9),
  getDateWithTimeNum(new Date(), 9),
  getDateWithTimeNum(getDateDayOffset(new Date(), 1), 9),
])
const responses = ref<Record<string, unknown>>({})
const calendarEventsByDay = ref<CalendarEventsByDay>([])

const scheduleOverlap = ref<ScheduleOverlapRef | null>(null)

const duration = computed(() => (isPhone.value ? 6 : 8))
const startTime = computed(() => dateToTimeNum(new Date(dates.value[0]), true))
const endTime = computed(() => (startTime.value + duration.value) % 24)

const event = computed(() => ({
  dates: dates.value.map(d => d.getTime()),
  duration: duration.value,
  startTime: startTime.value,
  endTime: endTime.value,
}))

const getCalendarEventsByDay = () => {
  const [day1, day2, day3] = dates.value
  const events = [
    {
      startDate: getDateWithTimeNum(day1, 9),
      endDate: getDateWithTimeNum(day1, 10),
      summary: "Coffee with Jen",
    },
    {
      startDate: getDateWithTimeNum(day2, 11),
      endDate: getDateWithTimeNum(day2, 14),
      summary: "Karaoke with friends",
    },
    {
      startDate: getDateWithTimeNum(day3, 13),
      endDate: getDateWithTimeNum(day3, 17),
      summary: "Study session",
    },
  ]

  if (!isPhone.value) {
    events.push({
      startDate: getDateWithTimeNum(day3, 20.5),
      endDate: getDateWithTimeNum(day3, 22),
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
  responses.value = {
    "62828fec1bc681fa020632f2": {
      user: { _id: "1", name: "1" },
      availability: [
        getDateWithTimeNum(day1, 10),
        getDateWithTimeNum(day1, 10.5),
        getDateWithTimeNum(day1, 11),
        getDateWithTimeNum(day1, 11.5),
        getDateWithTimeNum(day1, 12),
        getDateWithTimeNum(day1, 12.5),
        getDateWithTimeNum(day1, 13),
        getDateWithTimeNum(day1, 14.5),
        getDateWithTimeNum(day1, 15),
        getDateWithTimeNum(day1, 15.5),
        getDateWithTimeNum(day1, 16),
        getDateWithTimeNum(day1, 16.5),
        getDateWithTimeNum(day1, 17),
        getDateWithTimeNum(day1, 17.5),
        getDateWithTimeNum(day1, 18),
        getDateWithTimeNum(day1, 18.5),
        getDateWithTimeNum(day1, 19),
        getDateWithTimeNum(day1, 20.5),
        getDateWithTimeNum(day1, 21),
        getDateWithTimeNum(day1, 21.5),

        getDateWithTimeNum(day2, 9),
        getDateWithTimeNum(day2, 9.5),
        getDateWithTimeNum(day2, 14),
        getDateWithTimeNum(day2, 14.5),
        getDateWithTimeNum(day2, 15),
        getDateWithTimeNum(day2, 15.5),
        getDateWithTimeNum(day2, 16),
        getDateWithTimeNum(day2, 16.5),
        getDateWithTimeNum(day2, 17),
        getDateWithTimeNum(day2, 17.5),
        getDateWithTimeNum(day2, 18),
        getDateWithTimeNum(day2, 18.5),
        getDateWithTimeNum(day2, 19),
        getDateWithTimeNum(day2, 19.5),
        getDateWithTimeNum(day2, 20),
        getDateWithTimeNum(day2, 21.5),

        getDateWithTimeNum(day3, 12.5),
        getDateWithTimeNum(day3, 17),
        getDateWithTimeNum(day3, 19.5),
      ],
    },
    "628292fe6e12d2baa9c01395": {
      user: { _id: "2", name: "2" },
      availability: [
        getDateWithTimeNum(day1, 14),
        getDateWithTimeNum(day1, 14.5),
        getDateWithTimeNum(day1, 15),
        getDateWithTimeNum(day1, 15.5),
        getDateWithTimeNum(day1, 16),
        getDateWithTimeNum(day1, 16.5),
        getDateWithTimeNum(day1, 17),
        getDateWithTimeNum(day1, 17.5),
        getDateWithTimeNum(day1, 18),
        getDateWithTimeNum(day1, 18.5),
        getDateWithTimeNum(day1, 19),
        getDateWithTimeNum(day1, 19.5),
        getDateWithTimeNum(day1, 20),
        getDateWithTimeNum(day1, 20.5),
        getDateWithTimeNum(day1, 21),
        getDateWithTimeNum(day1, 21.5),

        getDateWithTimeNum(day2, 9),
        getDateWithTimeNum(day2, 9.5),
        getDateWithTimeNum(day2, 10),
        getDateWithTimeNum(day2, 10.5),
        getDateWithTimeNum(day2, 16),
        getDateWithTimeNum(day2, 16.5),
        getDateWithTimeNum(day2, 17),
        getDateWithTimeNum(day2, 17.5),
        getDateWithTimeNum(day2, 18),
        getDateWithTimeNum(day2, 18.5),
        getDateWithTimeNum(day2, 19),
        getDateWithTimeNum(day2, 19.5),
        getDateWithTimeNum(day2, 20),
        getDateWithTimeNum(day2, 20.5),
        getDateWithTimeNum(day2, 21),
        getDateWithTimeNum(day2, 21.5),

        getDateWithTimeNum(day3, 9),
        getDateWithTimeNum(day3, 9.5),
        getDateWithTimeNum(day3, 10),
        getDateWithTimeNum(day3, 12.5),
        getDateWithTimeNum(day3, 17),
        getDateWithTimeNum(day3, 18),
        getDateWithTimeNum(day3, 18.5),
        getDateWithTimeNum(day3, 19),
        getDateWithTimeNum(day3, 19.5),
        getDateWithTimeNum(day3, 20),
      ],
    },
    "628208870df4418ff4213757": {
      user: { _id: "3", name: "3" },
      availability: [
        getDateWithTimeNum(day1, 11),
        getDateWithTimeNum(day1, 11.5),
        getDateWithTimeNum(day1, 12),
        getDateWithTimeNum(day1, 12.5),
        getDateWithTimeNum(day1, 13),
        getDateWithTimeNum(day1, 13.5),
        getDateWithTimeNum(day1, 14),
        getDateWithTimeNum(day1, 14.5),
        getDateWithTimeNum(day1, 15),
        getDateWithTimeNum(day1, 15.5),
        getDateWithTimeNum(day1, 16),
        getDateWithTimeNum(day1, 16.5),
        getDateWithTimeNum(day1, 20),
        getDateWithTimeNum(day1, 20.5),
        getDateWithTimeNum(day1, 21),
        getDateWithTimeNum(day1, 21.5),

        getDateWithTimeNum(day2, 9),
        getDateWithTimeNum(day2, 9.5),
        getDateWithTimeNum(day2, 10),
        getDateWithTimeNum(day2, 10.5),
        getDateWithTimeNum(day2, 19),
        getDateWithTimeNum(day2, 19.5),
        getDateWithTimeNum(day2, 20),
        getDateWithTimeNum(day2, 20.5),
        getDateWithTimeNum(day2, 21),
        getDateWithTimeNum(day2, 21.5),

        getDateWithTimeNum(day3, 9),
        getDateWithTimeNum(day3, 9.5),
        getDateWithTimeNum(day3, 10),
        getDateWithTimeNum(day3, 10.5),
        getDateWithTimeNum(day3, 11),
        getDateWithTimeNum(day3, 11.5),
        getDateWithTimeNum(day3, 12),
        getDateWithTimeNum(day3, 12.5),
        getDateWithTimeNum(day3, 17),
        getDateWithTimeNum(day3, 17.5),
        getDateWithTimeNum(day3, 18),
        getDateWithTimeNum(day3, 18.5),
        getDateWithTimeNum(day3, 19),
        getDateWithTimeNum(day3, 19.5),
        getDateWithTimeNum(day3, 20),
      ],
    },
  }

  for (const id of Object.keys(responses.value)) {
    const fixedAvailability: Date[] = []
    const userEntry = responses.value[id] as { availability: Date[] }
    for (const date of userEntry.availability) {
      fixedAvailability.push(date)
      const dateCopy = new Date(date)
      dateCopy.setMinutes(date.getMinutes() + 15)
      fixedAvailability.push(dateCopy)
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
