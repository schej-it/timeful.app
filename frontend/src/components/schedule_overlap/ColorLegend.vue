<template>
  <div class="tw-flex tw-flex-col tw-gap-1">
    <div class="tw-text-sm tw-font-medium">Legend:</div>
    <div class="tw-flex tw-items-center tw-gap-2">
      <div
        class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray tw-bg-[#00994C77]"
      ></div>
      <span class="tw-text-sm">Available</span>
    </div>
    <div class="tw-flex tw-items-center tw-gap-2">
      <div
        class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray tw-bg-yellow"
      ></div>
      <span class="tw-text-sm">If needed</span>
    </div>
    <div class="tw-flex tw-items-center tw-gap-2">
      <div
        class="color-legend-unavailable-swatch tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray"
      ></div>
      <span class="tw-text-sm">Unavailable</span>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.color-legend-unavailable-swatch {
  background-color: var(--timeful-unavailable-bg);
}
</style>
