<template>
  <v-dialog v-model="dialog" max-width="800px" content-class="tw-m-0 pa-0">
    <div class="video-container">
      <iframe
        width="100%"
        height="100%"
        src="https://www.youtube.com/embed/vFkBC8BrkOk?si=pF64JAIyDhom_1do&autoplay=1"
        title="YouTube video player - How Timeful Works"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      >
      </iframe>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => { emit("update:modelValue", val); },
})
</script>

<style scoped>
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  background-color: #000;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
