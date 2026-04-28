<template>
  <v-avatar v-if="user" :size="size">
    <img v-if="user.picture" :src="user.picture" referrerpolicy="no-referrer" />
    <v-icon
      v-else-if="'calendarType' in user && user.calendarType === calendarTypes.APPLE"
      class="-tw-mt-1"
      :size="size"
    >
      mdi-apple
    </v-icon>
    <v-icon
      v-else-if="'calendarType' in user && user.calendarType === calendarTypes.OUTLOOK"
      :size="size"
    >
      mdi-microsoft-outlook
    </v-icon>
    <div
      v-else
      :class="`tw-flex tw-size-full tw-items-center tw-justify-center tw-bg-[linear-gradient(-25deg,#2b6cb0,#63b3ed,#2b6cb0)] tw-text-${textSize} tw-text-white`"
    >
      {{ user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? "" }}
    </div>
  </v-avatar>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { calendarTypes } from "@/constants"
import type { User } from "@/types"

const props = withDefaults(
  defineProps<{
    user?: Partial<User> | null
    size?: number
  }>(),
  { 
    user: null,
    size: 48 
  }
)

const textSize = computed(() => (props.size <= 24 ? "xs" : "lg"))
</script>
