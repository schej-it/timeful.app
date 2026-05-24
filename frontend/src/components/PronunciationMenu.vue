<template>
  <v-menu
    :nudge-bottom="10"
    offset-y
    :close-on-content-click="false"
    @update:model-value="handleMenuStateChange"
  >
    <template #activator="{ props }">
      <span
        class="tw-cursor-pointer"
        :class="{
          'tw-underline': isMenuOpen,
          'hover:tw-underline': !isMenuOpen,
        }"
        v-bind="props"
      >
        how to pronounce "schej"?
      </span>
    </template>
    <v-card class="tw-p-3 tw-text-center">
      <div class="tw-text-left tw-text-sm">
        Pronounced like "schedule" but shorter - "skej"
      </div>
      <div
        class="pronunciation-image-container tw-mt-3 tw-flex tw-items-center tw-justify-center"
      >
        <img
          :src="currentImageSrc"
          alt="Schej pronunciation animation"
          class="pronunciation-animation-image"
        />
      </div>
      <audio ref="pronunciationAudio" controls class="tw-hidden" autoplay>
        <source
          src="@/assets/audio/schej_pronunciation.mp3"
          type="audio/mpeg"
        />
        Your browser does not support the audio element.
      </audio>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { usePronunciationMenuPlayback } from "@/composables/usePronunciationMenuPlayback"
import img0 from "@/assets/doodles/pronunciation/0.jpg"
import img1 from "@/assets/doodles/pronunciation/1.jpg"
import img2 from "@/assets/doodles/pronunciation/2.jpg"
import img3 from "@/assets/doodles/pronunciation/3.jpg"
import img4 from "@/assets/doodles/pronunciation/4.jpg"

const images = [img0, img1, img2, img3, img4]
const pronunciationAudio = ref<HTMLAudioElement | null>(null)

const { isMenuOpen, currentImageSrc, handleMenuStateChange } =
  usePronunciationMenuPlayback({
    audio: pronunciationAudio,
    images,
    onAudioPlayError: (error: unknown) => {
      console.warn("Audio play prevented: ", error)
    },
  })
</script>

<style scoped>
.pronunciation-image-container {
  min-height: 100px;
}
.pronunciation-animation-image {
  max-width: 100%;
  max-height: 100px;
  object-fit: contain;
}
</style>
