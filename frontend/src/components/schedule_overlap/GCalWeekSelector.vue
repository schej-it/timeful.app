<template>
  <div
    class="tw-flex tw-h-16 tw-items-center tw-justify-between tw-gap-2 tw-bg-surface tw-px-2 tw-drop-shadow sm:tw-h-[unset] sm:tw-flex-1 sm:tw-px-0 sm:tw-drop-shadow-none"
  >
    <v-btn @click="prevWeek" icon><v-icon>mdi-chevron-left</v-icon></v-btn>
    <div class="tw-text-center">
      Showing calendar for week of {{ weekText }}
    </div>
    <v-btn @click="nextWeek" icon><v-icon>mdi-chevron-right</v-icon></v-btn>
  </div>
</template>

<script>
import { isPhone, dateToDowDate } from "@/utils"
import dayjs from "dayjs"

export default {
  name: "GCalWeekSelector",

  props: {
    weekOffset: { type: Number, required: true },
    startOnMonday: { type: Boolean, default: false },
    event: { type: Object, required: true },
  },

  data() {
    return {}
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
    weekText() {
      const date = dateToDowDate(
        this.event.dates,
        this.event.dates[0],
        this.weekOffset,
        true
      )
      // Set date to the Sunday of the current week
      date.setDate(date.getDate() - date.getDay())

      if (this.startOnMonday) {
        date.setDate(date.getDate() + 1)
      }

      return dayjs(date).format("M/D")
    },
  },

  methods: {
    nextWeek() {
      this.$emit("update:weekOffset", this.weekOffset + 1)
    },
    prevWeek() {
      this.$emit("update:weekOffset", this.weekOffset - 1)
    },
  },
}
</script>
