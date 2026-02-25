<template>
  <div class="tw-flex tw-flex-col tw-gap-4 tw-pr-2 lg:tw-pr-0">
    <div class="tw-text-sm tw-italic tw-text-text-muted">
      Click and drag on the grid to select the potential meeting times
    </div>

    <div class="tw-flex tw-flex-col tw-gap-1">
      <div class="tw-text-sm tw-font-medium">Legend:</div>
      <div class="tw-flex tw-items-center tw-gap-2">
        <div class="tw-h-4 tw-w-4 tw-rounded tw-bg-gray"></div>
        <span class="tw-text-sm">Blocked off</span>
      </div>
      <div class="tw-flex tw-items-center tw-gap-2">
        <div
          class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray tw-bg-surface"
        ></div>
        <span class="tw-text-sm">Potential meeting times</span>
      </div>
    </div>
    <v-btn color="primary" @click="saveTempTimes" :disabled="numTempTimes === 0"
      >Next</v-btn
    >
  </div>
</template>

<script>
export default {
  name: "SpecificTimesInstructions",
  props: {
    numTempTimes: {
      type: Number,
      required: true,
    },
  },
  methods: {
    saveTempTimes() {
      this.$emit("saveTempTimes")
    },
  },
}
</script>

<style scoped>
/* Styles can be added here if needed */
</style>
