<template>
  <div
    v-if="showGradient"
    class="tw-pointer-events-none tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-z-20 tw-flex tw-h-16 tw-items-end tw-justify-center"
    :style="{
      background:
        'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)',
    }"
  >
    <v-btn
      v-if="showArrow"
      fab
      x-small
      class="tw-pointer-events-auto tw-transform"
      @click="scrollToBottom"
    >
      <v-icon>mdi-chevron-down</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"

const props = withDefaults(
  defineProps<{
    scrollContainer: HTMLElement | null
    showArrow?: boolean
  }>(),
  { showArrow: true }
)

const showGradient = ref(false)

const checkScroll = () => {
  if (!props.scrollContainer) return
  const { scrollHeight, clientHeight, scrollTop } = props.scrollContainer
  showGradient.value =
    scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 1
}

const scrollToBottom = () => {
  if (!props.scrollContainer) return
  // Use a local variable to avoid mutating the prop directly
  const container = props.scrollContainer
  container.scrollTop = container.scrollHeight
}

onMounted(() => {
  checkScroll()
  props.scrollContainer?.addEventListener("scroll", checkScroll)
})

onBeforeUnmount(() => {
  props.scrollContainer?.removeEventListener("scroll", checkScroll)
})
</script>
