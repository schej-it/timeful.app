<template>
  <div class="tw-flex tw-flex-col tw-gap-4 tw-pr-2 lg:tw-pr-0">
    <div class="tw-text-sm tw-italic tw-text-dark-gray">
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
          class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray tw-bg-white"
        ></div>
        <span class="tw-text-sm">Potential meeting times</span>
      </div>
    </div>
    <v-btn color="primary" :disabled="numTempTimes === 0" @click="emit('saveTempTimes')"
      >Next</v-btn
    >
  </div>
</template>

<script setup lang="ts">
defineProps<{
  numTempTimes: number
}>()

const emit = defineEmits<{
  saveTempTimes: []
}>()
</script>

<style scoped></style>
