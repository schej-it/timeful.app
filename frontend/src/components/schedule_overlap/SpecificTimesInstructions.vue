<template>
  <div class="tw-flex tw-flex-col tw-gap-4 tw-pr-2 lg:tw-pr-0">
    <div class="tw-text-sm tw-italic tw-text-dark-gray">
      Click and drag on the grid to select the potential meeting times
    </div>

    <div class="tw-flex tw-flex-col tw-gap-1">
      <div class="tw-text-sm tw-font-medium">Legend:</div>
      <div class="tw-flex tw-items-center tw-gap-2">
        <div
          class="specific-times-instructions-swatch tw-bg-gray"
        ></div>
        <span class="tw-text-sm">Blocked off</span>
      </div>
      <div class="tw-flex tw-items-center tw-gap-2">
        <div
          class="specific-times-instructions-swatch specific-times-instructions-swatch--potential"
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

<style scoped>
.specific-times-instructions-swatch {
  flex: none;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
}

.specific-times-instructions-swatch--potential {
  background-color: white;
  box-shadow: inset 0 0 0 1px var(--timeful-grid-separator-strong);
}
</style>
