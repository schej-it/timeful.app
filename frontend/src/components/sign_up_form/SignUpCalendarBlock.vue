<template>
  <div
    class="tw-h-full tw-w-full tw-cursor-pointer tw-overflow-hidden tw-rounded-md tw-border-2 tw-border-solid tw-bg-white"
    :class="unsaved ? 'tw-border-light-green' : 'tw-border-gray'"
  >
    <div
      class="tw-h-full tw-w-full tw-overflow-hidden tw-text-ellipsis tw-p-1 tw-text-xs"
      :style="{ backgroundColor: backgroundColor }"
    >
      <div v-if="!titleOnly">
        <div class="ph-no-capture tw-font-medium" :class="fontColor">
          {{ signUpBlock?.name }}
        </div>
        <div class="ph-no-capture tw-font-medium" :class="fontColor">
          ({{ numberResponses }}/{{ signUpBlock?.capacity }})
        </div>
      </div>
      <div v-else>
        <div class="tw-text-xs tw-italic" :class="fontColor">
          {{ title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    signUpBlock?: { name?: string; capacity?: number; responses?: unknown[] } | null
    unsaved?: boolean
    titleOnly?: boolean
    title?: string
  }>(),
  { signUpBlock: null, unsaved: false, titleOnly: false, title: "" }
)

const numberResponses = computed(() =>
  props.signUpBlock?.responses
    ? props.signUpBlock.responses.length
    : 0
)

const backgroundColor = computed(() => {
  const capacity = props.signUpBlock ? props.signUpBlock.capacity ?? 1 : 1
  const frac = numberResponses.value / capacity
  const green = "#00994C"
  let alpha = Math.floor(frac * (255 - 30))
    .toString(16)
    .toUpperCase()
    .substring(0, 2)
    .padStart(2, "0")
  if (frac == 1) alpha = "FF"
  return `${green}${alpha}`
})

const fontColor = computed(() =>
  numberResponses.value == props.signUpBlock?.capacity && !props.unsaved
    ? "tw-text-white"
    : "tw-text-dark-gray"
)
</script>
