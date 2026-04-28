<template>
  <v-scale-transition appear origin="center">
    <v-btn
      fab
      fixed
      class="tw-bottom-4 tw-left-0 tw-right-0 tw-mx-auto tw-bg-green tw-text-white sm:tw-bottom-8"
      v-bind="$attrs"
      @click="(e: MouseEvent) => emit('click', e)"
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
