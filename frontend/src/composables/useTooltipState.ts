import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue"

const TOOLTIP_Y_OFFSET_PX = 30
const TOOLTIP_SHOW_DELAY_MS = 700

export interface TooltipPosition {
  x: number
  y: number
}

export interface TooltipState {
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  handleMouseMove: (event: MouseEvent) => void
  isVisible: Ref<boolean>
  position: Ref<TooltipPosition>
  style: ComputedRef<Record<string, string>>
}

export const useTooltipState = (content: Ref<string>): TooltipState => {
  const position = ref<TooltipPosition>({ x: 0, y: 0 })
  const isVisible = ref(false)
  let showTimeout: ReturnType<typeof setTimeout> | null = null

  const clearShowTimeout = () => {
    if (showTimeout !== null) {
      clearTimeout(showTimeout)
      showTimeout = null
    }
  }

  watch(
    content,
    newContent => {
      clearShowTimeout()
      isVisible.value = false

      if (newContent) {
        showTimeout = setTimeout(() => {
          isVisible.value = true
          showTimeout = null
        }, TOOLTIP_SHOW_DELAY_MS)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(clearShowTimeout)

  return {
    handleMouseMove: event => {
      position.value = {
        x: event.clientX,
        y: event.clientY - TOOLTIP_Y_OFFSET_PX,
      }
    },
    handleMouseEnter: () => {
      if (content.value) {
        isVisible.value = true
      }
    },
    handleMouseLeave: () => {
      isVisible.value = false
    },
    isVisible,
    position,
    style: computed(() => ({
      left: `${String(position.value.x)}px`,
      top: `${String(position.value.y)}px`,
      transform: "translate(-50%, -50%)",
    })),
  }
}
