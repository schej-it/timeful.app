<template>
  <v-container
    class="tw-flex tw-justify-between tw-rounded-md tw-bg-light-gray tw-py-2 tw-align-middle tw-text-black"
    @click="$emit('click')"
  >
    <div class="tw-mt-2 tw-flex">
      <div class="tw-mr-3">
        <v-avatar>
          <img
            v-if="!user.picture"
            src="https://cdn.vuetifyjs.com/images/john.jpg"
          />
          <img v-else :src="user.picture" />
        </v-avatar>
      </div>
      <div>
        <div class="tw-font-medium">{{ user.name }}</div>
        <div class="tw-text-sm">
          Currently
          <span
            v-if="user.status == 'free'"
            class="tw-font-bold tw-text-green"
            >free</span
          ><span v-else>
            in
            <span class="tw-font-bold tw-text-light-blue">
              {{ user.status }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <div>
      <v-switch
        v-model="showEventNames"
        class="timeful-switch"
        color="primary"
        inset
      ></v-switch>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { useShowEventNamesPreference } from "@/composables/useShowEventNamesPreference"

interface UserShape {
  name: string
  status: string
  picture?: string
}

defineProps<{ user: UserShape }>()

const emit = defineEmits<{
  click: []
  showEventNames: [value: boolean]
}>()

const { showEventNames } = useShowEventNamesPreference(value => {
  emit("showEventNames", value)
})
</script>
