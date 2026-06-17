import { computed, onBeforeUnmount, ref, type Ref } from "vue"

export interface UsePronunciationMenuPlaybackOptions {
  audio: Ref<HTMLAudioElement | null>
  images: string[]
  animationSpeedMs?: number
  onAudioPlayError?: (error: unknown) => void
}

export const usePronunciationMenuPlayback = ({
  audio,
  images,
  animationSpeedMs = 200,
  onAudioPlayError,
}: UsePronunciationMenuPlaybackOptions) => {
  const isMenuOpen = ref(false)
  const currentImageIndex = ref(0)
  let animationInterval: ReturnType<typeof setInterval> | null = null
  let resetTimeout: ReturnType<typeof setTimeout> | null = null

  const currentImageSrc = computed(() => images[currentImageIndex.value] ?? "")

  const clearAnimationInterval = () => {
    if (animationInterval != null) {
      clearInterval(animationInterval)
      animationInterval = null
    }
  }

  const clearResetTimeout = () => {
    if (resetTimeout != null) {
      clearTimeout(resetTimeout)
      resetTimeout = null
    }
  }

  const stopPlayback = () => {
    clearAnimationInterval()
    clearResetTimeout()
    currentImageIndex.value = 0

    if (audio.value != null) {
      audio.value.pause()
      audio.value.currentTime = 0
    }
  }

  const startPlayback = () => {
    clearAnimationInterval()
    clearResetTimeout()
    currentImageIndex.value = Math.min(1, Math.max(images.length - 1, 0))

    animationInterval = setInterval(() => {
      if (currentImageIndex.value < images.length - 1) {
        currentImageIndex.value += 1
        return
      }

      clearAnimationInterval()
      resetTimeout = setTimeout(() => {
        resetTimeout = null
        currentImageIndex.value = 0
      }, animationSpeedMs)
    }, animationSpeedMs)

    if (audio.value != null) {
      audio.value.currentTime = 0
      audio.value.play().catch((error: unknown) => {
        onAudioPlayError?.(error)
      })
    }
  }

  const handleMenuStateChange = (isOpen: boolean) => {
    isMenuOpen.value = isOpen
    if (isOpen) {
      startPlayback()
    } else {
      stopPlayback()
    }
  }

  onBeforeUnmount(stopPlayback)

  return {
    isMenuOpen,
    currentImageIndex,
    currentImageSrc,
    handleMenuStateChange,
    stopPlayback,
  }
}
