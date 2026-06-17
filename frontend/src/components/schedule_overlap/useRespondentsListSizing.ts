import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"

export function useRespondentsListSizing() {
  const scrollableSection = ref<HTMLElement | null>(null)
  const respondentsScrollView = ref<HTMLElement | null>(null)
  const desktopMaxHeight = ref(0)
  const hasMounted = ref(false)
  const respondentsListMinHeight = 400

  const respondentsListMaxHeight = computed(() =>
    Math.max(desktopMaxHeight.value, respondentsListMinHeight)
  )

  function setDesktopMaxHeight() {
    const el = scrollableSection.value
    if (el) {
      const { top } = el.getBoundingClientRect()
      desktopMaxHeight.value = window.innerHeight - top - 32
      return
    }

    desktopMaxHeight.value = 0
  }

  onMounted(() => {
    setDesktopMaxHeight()
    addEventListener("resize", setDesktopMaxHeight)
    void nextTick(() => {
      hasMounted.value = true
    })
  })

  onBeforeUnmount(() => {
    removeEventListener("resize", setDesktopMaxHeight)
  })

  return {
    scrollableSection,
    respondentsScrollView,
    respondentsListMaxHeight,
    hasMounted,
  }
}
