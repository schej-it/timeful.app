<template>
  <div v-if="isPhone">
    <v-menu v-model="menuOpen">
      <template #activator="{ props }">
        <v-btn icon v-bind="props">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </template>
      <v-card class="tw-flex tw-flex-col tw-gap-2 tw-p-2 tw-text-left">
        <slot></slot>
      </v-card>
    </v-menu>
  </div>
  <div v-else class="tw-flex tw-items-center">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"

const { isPhone } = useDisplayHelpers()
const menuOpen = ref(false)
</script>
