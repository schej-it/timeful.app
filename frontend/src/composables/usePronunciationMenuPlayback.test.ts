// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { usePronunciationMenuPlayback } from "./usePronunciationMenuPlayback"

const images = ["0.jpg", "1.jpg", "2.jpg", "3.jpg", "4.jpg"]

interface PronunciationPlaybackVm {
  isMenuOpen: boolean
  currentImageIndex: number
  handleMenuStateChange: (isOpen: boolean) => void
}

const mountPlaybackHost = (options?: {
  playImpl?: () => Promise<void>
  onAudioPlayError?: (error: unknown) => void
}) => {
  const pause = vi.fn()
  const play = vi.fn(options?.playImpl ?? (() => Promise.resolve()))
  const audio = {
    currentTime: 0,
    pause,
    play,
  } as unknown as HTMLAudioElement

  const wrapper = mount(
    defineComponent({
      setup() {
        const audioRef = ref(audio)
        return {
          ...usePronunciationMenuPlayback({
            audio: audioRef,
            images,
            onAudioPlayError: options?.onAudioPlayError,
          }),
        }
      },
      template: "<div />",
    })
  )

  return {
    wrapper,
    vm: wrapper.vm as unknown as PronunciationPlaybackVm,
    audio,
    pause,
    play,
  }
}

describe("usePronunciationMenuPlayback", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts animation from the second frame and resets after the final frame", () => {
    vi.useFakeTimers()

    const { vm, play } = mountPlaybackHost()

    vm.handleMenuStateChange(true)

    expect(vm.isMenuOpen).toBe(true)
    expect(vm.currentImageIndex).toBe(1)
    expect(play).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(200)
    expect(vm.currentImageIndex).toBe(2)

    vi.advanceTimersByTime(200)
    expect(vm.currentImageIndex).toBe(3)

    vi.advanceTimersByTime(200)
    expect(vm.currentImageIndex).toBe(4)

    vi.advanceTimersByTime(200)
    expect(vm.currentImageIndex).toBe(4)

    vi.advanceTimersByTime(200)
    expect(vm.currentImageIndex).toBe(0)
  })

  it("stops playback and clears timers when the menu closes", () => {
    vi.useFakeTimers()

    const { vm, audio, pause } = mountPlaybackHost()

    vm.handleMenuStateChange(true)
    vi.advanceTimersByTime(200)

    vm.handleMenuStateChange(false)

    expect(vm.isMenuOpen).toBe(false)
    expect(vm.currentImageIndex).toBe(0)
    expect(audio.currentTime).toBe(0)
    expect(pause).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    expect(vm.currentImageIndex).toBe(0)
  })

  it("stops playback on unmount", () => {
    vi.useFakeTimers()

    const { wrapper, vm, audio, pause } = mountPlaybackHost()

    vm.handleMenuStateChange(true)
    wrapper.unmount()

    expect(audio.currentTime).toBe(0)
    expect(pause).toHaveBeenCalled()
  })

  it("reports audio autoplay failures without breaking animation state", async () => {
    vi.useFakeTimers()
    const onAudioPlayError = vi.fn()
    const expectedError = new Error("autoplay blocked")

    const { vm } = mountPlaybackHost({
      playImpl: () => Promise.reject(expectedError),
      onAudioPlayError,
    })

    vm.handleMenuStateChange(true)
    await Promise.resolve()

    expect(onAudioPlayError).toHaveBeenCalledWith(expectedError)
    expect(vm.currentImageIndex).toBe(1)
  })
})
