<template>
  <v-scale-transition appear origin="center">
    <v-speed-dial
      v-model="speedDial"
      fixed
      transition="slide-y-reverse-transition"
      class="tw-bottom-4 tw-left-0 tw-right-0 tw-mx-auto tw-w-fit sm:tw-bottom-8"
    >
      <template #activator="{ props: activatorProps }">
        <v-btn v-bind="activatorProps" fab color="primary" dark>
          <v-icon v-if="speedDial"> mdi-close </v-icon>
          <v-icon v-else> mdi-plus </v-icon>
        </v-btn>
      </template>
      <v-btn fab small dark class="tw-bg-dark-gray">
        <v-icon small>mdi-account-group</v-icon>
      </v-btn>
      <v-btn fab small dark class="tw-bg-dark-gray">
        <v-icon small>mdi-calendar-cursor</v-icon>
      </v-btn>
    </v-speed-dial>
  </v-scale-transition>
</template>

<script setup lang="ts">
import { ref } from "vue"

defineEmits<{
  createGroup: []
  createEvent: []
}>()

const speedDial = ref(false)
</script>
