<template>
  <div ref="tooltipTrigger" class="tw-relative">
    <slot></slot>
    <div
      v-if="isVisible && content"
      class="tw-pointer-events-none tw-fixed tw-z-50 tw-rounded-lg tw-bg-dark-gray tw-px-1.5 tw-py-1 tw-text-xs tw-text-white tw-shadow-lg tw-transition-opacity tw-duration-200"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }"
    >
      {{ content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"

defineOptions({ name: "AppTooltip" })

const props = withDefaults(
  defineProps<{
    content?: string
  }>(),
  { content: "" }
)

const tooltipTrigger = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })
const isVisible = ref(false)
const showTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

watch(
  () => props.content,
  (newContent) => {
    if (showTimeout.value) {
      clearTimeout(showTimeout.value)
    }
    isVisible.value = false
    if (newContent) {
      showTimeout.value = setTimeout(() => {
        isVisible.value = true
      }, 700)
    }
  },
  { immediate: true }
)

const handleMouseMove = (e: MouseEvent) => {
  position.value = {
    x: e.clientX,
    y: e.clientY - 30,
  }
}
const handleMouseEnter = () => {
  if (props.content) {
    isVisible.value = true
  }
}
const handleMouseLeave = () => {
  isVisible.value = false
}

onMounted(() => {
  if (tooltipTrigger.value) {
    tooltipTrigger.value.addEventListener("mousemove", handleMouseMove)
    tooltipTrigger.value.addEventListener("mouseenter", handleMouseEnter)
    tooltipTrigger.value.addEventListener("mouseleave", handleMouseLeave)
  }
})

onBeforeUnmount(() => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (tooltipTrigger.value) {
    tooltipTrigger.value.removeEventListener("mousemove", handleMouseMove)
    tooltipTrigger.value.removeEventListener("mouseenter", handleMouseEnter)
    tooltipTrigger.value.removeEventListener("mouseleave", handleMouseLeave)
  }
})
</script>
