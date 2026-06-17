<template>
  <v-chip
    :key="user.email"
    size="x-small"
    class="tw-flex tw-w-fit tw-items-center tw-bg-light-gray tw-text-very-dark-gray"
  >
    <v-avatar class="bg-accent text-uppercase tw-mr-2" start
      ><img
        v-if="user.picture"
        :src="user.picture"
        referrerpolicy="no-referrer"
        width="10px"
      />
      <v-icon v-else>mdi-account</v-icon></v-avatar
    >
    {{ user.email }}

    <v-icon
      v-if="removable"
      small
      class="tw-ml-1"
      @click="() => removeEmail(user.email ?? '')"
      >mdi-close</v-icon
    >
  </v-chip>
</template>

<script setup lang="ts">
import type { User } from "@/types"

withDefaults(
  defineProps<{
    user: Partial<User>
    removable?: boolean
    removeEmail?: (email: string) => void
  }>(),
  {
    removable: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeEmail: () => {},
  }
)
</script>
