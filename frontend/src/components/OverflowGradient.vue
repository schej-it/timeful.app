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
      icon
      size="x-small"
      class="tw-pointer-events-auto tw-transform"
      @click="scrollToBottom"
    >
      <v-icon>mdi-chevron-down</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    scrollContainer: HTMLElement | null
    showArrow?: boolean
  }>(),
  { showArrow: true }
)

const showGradient = ref(false)
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

const detachObserver = () => {
  resizeObserver?.disconnect()
  resizeObserver = null
  mutationObserver?.disconnect()
  mutationObserver = null
}

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
  if (props.scrollContainer && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      checkScroll()
    })
    resizeObserver.observe(props.scrollContainer)
  }
  if (props.scrollContainer && typeof MutationObserver !== "undefined") {
    mutationObserver = new MutationObserver(() => {
      checkScroll()
    })
    mutationObserver.observe(props.scrollContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
})

onBeforeUnmount(() => {
  props.scrollContainer?.removeEventListener("scroll", checkScroll)
  detachObserver()
})

watch(
  () => props.scrollContainer,
  (nextContainer, prevContainer) => {
    prevContainer?.removeEventListener("scroll", checkScroll)
    detachObserver()

    nextContainer?.addEventListener("scroll", checkScroll)
    if (nextContainer && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkScroll()
      })
      resizeObserver.observe(nextContainer)
    }
    if (nextContainer && typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        checkScroll()
      })
      mutationObserver.observe(nextContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    checkScroll()
  }
)
</script>
