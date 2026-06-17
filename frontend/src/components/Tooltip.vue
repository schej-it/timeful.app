<template>
  <div
    class="tw-relative"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <slot></slot>
    <div
      v-if="isVisible && content"
      class="tw-pointer-events-none tw-fixed tw-z-50 tw-rounded-lg tw-bg-dark-gray tw-px-1.5 tw-py-1 tw-text-xs tw-text-white tw-shadow-lg tw-transition-opacity tw-duration-200"
      :style="style"
    >
      {{ content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue"
import { useTooltipState } from "@/composables/useTooltipState"

defineOptions({ name: "AppTooltip" })

const props = withDefaults(
  defineProps<{
    content?: string
  }>(),
  { content: "" }
)

const { handleMouseEnter, handleMouseLeave, handleMouseMove, isVisible, style } =
  useTooltipState(toRef(props, "content"))
</script>
