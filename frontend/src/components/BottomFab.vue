<template>
  <v-scale-transition appear origin="center">
    <v-btn
      icon
      fixed
      class="timeful-elevated-button tw-bottom-4 tw-left-0 tw-right-0 tw-mx-auto tw-bg-green tw-text-white sm:tw-bottom-8"
      v-bind="$attrs"
      @click="emit('click', $event)"
    >
      <slot />
    </v-btn>
  </v-scale-transition>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
