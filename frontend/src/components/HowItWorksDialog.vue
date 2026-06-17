<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    content-class="tw-m-0 pa-0"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
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
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()
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
