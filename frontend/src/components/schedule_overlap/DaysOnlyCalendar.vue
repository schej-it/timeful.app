<template>
  <div>
    <div class="tw-flex tw-items-center tw-justify-between">
      <v-btn
        :class="hasPrevPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="$emit('prevPage')"
        ><v-icon>mdi-chevron-left</v-icon></v-btn
      >
      <div
        class="tw-text-lg tw-font-medium tw-capitalize sm:tw-text-xl"
      >
        {{ curMonthText }}
      </div>
      <v-btn
        :class="hasNextPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="$emit('nextPage')"
        ><v-icon>mdi-chevron-right</v-icon></v-btn
      >
    </div>
    <!-- Header -->
    <div class="tw-flex tw-w-full">
      <div
        v-for="day in daysOfWeek"
        :key="day"
        class="tw-flex-1 tw-p-2 tw-text-center tw-text-base tw-capitalize tw-text-dark-gray"
      >
        {{ day }}
      </div>
    </div>
    <!-- Days grid -->
    <div
      id="drag-section"
      class="tw-grid tw-grid-cols-7"
      @mouseleave="$emit('resetCurTimeslot')"
    >
      <div
        v-for="(day, i) in monthDays"
        :key="day.time"
        class="timeslot tw-aspect-square tw-p-2 tw-text-sm sm:tw-text-base"
        :class="dayTimeslotClassStyle[i].class"
        :style="dayTimeslotClassStyle[i].style"
        v-on="dayTimeslotVon[i]"
      >
        {{ day.date }}
      </div>
    </div>

    <v-expand-transition>
      <div
        :key="hintText"
        v-if="!isPhone && hintTextShown"
        class="tw-sticky tw-bottom-4 tw-z-10 tw-flex"
      >
        <div
          class="tw-mt-2 tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-rounded-md tw-bg-off-white tw-p-2 tw-px-[7px] tw-text-sm tw-text-very-dark-gray"
        >
          <div class="tw-flex tw-items-center tw-gap-1">
            <v-icon small>mdi-information-outline</v-icon>
            {{ hintText }}
          </div>
          <v-icon small @click="$emit('closeHint')">mdi-close</v-icon>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script>
const months = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
]

export default {
  name: "DaysOnlyCalendar",
  props: {
    event: { type: Object, required: true },
    page: { type: Number, required: true },
    monthDays: { type: Array, required: true },
    dayTimeslotClassStyle: { type: Array, required: true },
    dayTimeslotVon: { type: Array, required: true },
    hasPrevPage: { type: Boolean, required: true },
    hasNextPage: { type: Boolean, required: true },
    daysOfWeek: { type: Array, required: true },
    hintText: { type: String, default: "" },
    hintTextShown: { type: Boolean, default: false },
    isPhone: { type: Boolean, default: false },
  },
  computed: {
    curMonthText() {
      const date = new Date(this.event.dates[0])
      const monthIndex = date.getUTCMonth() + this.page
      const year = date.getUTCFullYear()
      const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))

      const monthText = months[lastDayOfCurMonth.getUTCMonth()]
      const yearText = lastDayOfCurMonth.getUTCFullYear()
      return `${monthText} ${yearText}`
    },
  },
}
</script>
