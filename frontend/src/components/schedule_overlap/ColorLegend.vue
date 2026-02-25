<template>
  <div class="tw-flex tw-flex-col tw-gap-1">
    <div class="tw-text-sm tw-font-medium">Legend:</div>
    <div class="tw-flex tw-items-center tw-gap-2">
      <div
        class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray"
        :style="{ backgroundColor: 'var(--color-avail-green)' }"
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
        class="tw-h-4 tw-w-4 tw-rounded tw-border tw-border-gray"
        :style="{ backgroundColor: 'var(--color-unavail-red-legend)' }"
      ></div>
      <span class="tw-text-sm">Unavailable</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "ColorLegend",
}
</script>
