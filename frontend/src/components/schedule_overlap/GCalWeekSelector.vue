<template>
  <div
    class="tw-flex tw-h-16 tw-items-center tw-justify-between tw-gap-2 tw-bg-white tw-px-2 tw-drop-shadow sm:tw-h-[unset] sm:tw-flex-1 sm:tw-px-0 sm:tw-drop-shadow-none"
  >
    <v-btn icon @click="prevWeek"><v-icon>mdi-chevron-left</v-icon></v-btn>
    <div class="tw-text-center">
      Showing calendar for week of {{ weekText }}
    </div>
    <v-btn icon @click="nextWeek"><v-icon>mdi-chevron-right</v-icon></v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { dateToDowDate } from "@/utils"
import type { Event } from "@/types"

const props = withDefaults(
  defineProps<{
    weekOffset: number
    startOnMonday?: boolean
    event: Event
  }>(),
  { startOnMonday: false }
)

const emit = defineEmits<{
  "update:weekOffset": [value: number]
}>()

const weekText = computed(() => {
  const dates = props.event.dates ?? []
  const date = dateToDowDate(
    dates,
    dates[0],
    props.weekOffset,
    true
  )
  // Get Sunday (or Monday if startOnMonday) of that week
  const dayOfWeek = date.dayOfWeek // 1-7 (Mon-Sun)
  const daysToSubtract = props.startOnMonday ? dayOfWeek - 1 : dayOfWeek % 7
  const weekStart = date.subtract({ days: daysToSubtract })
  const plainDate = weekStart.toPlainDate()
  return `${String(plainDate.month)}/${String(plainDate.day)}`
})

const nextWeek = () => { emit("update:weekOffset", props.weekOffset + 1); }
const prevWeek = () => { emit("update:weekOffset", props.weekOffset - 1); }
</script>
