<template>
  <div class="tw-mt-1 tw-max-w-full sm:tw-mt-2 sm:tw-max-w-[calc(100%-236px)]">
    <div
      v-if="showDescription"
      class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-light-gray-stroke tw-bg-light-gray tw-p-2 tw-text-xs tw-font-normal tw-text-very-dark-gray hover:tw-bg-[#eeeeee] sm:tw-text-sm"
    >
      <div class="tw-grow tw-space-y-1">
        <div
          v-for="(line, i) in (event.description ?? '').split('\n')"
          :key="i"
          class="tw-min-h-6 tw-leading-6"
        >
          {{ line }}
        </div>
      </div>
      <v-btn
        v-if="canEdit"
        key="edit-description-btn"
        class="-tw-my-1"
        icon
        small
        @click="isEditing = true"
      >
        <v-icon small>mdi-pencil</v-icon>
      </v-btn>
    </div>

    <v-btn
      v-else-if="canEdit && !isEditing"
      text
      class="-tw-ml-2 tw-mt-0 tw-w-min tw-px-2 tw-text-dark-gray"
      @click="isEditing = true"
    >
      + Add description
    </v-btn>
    <div
      :class="
        canEdit && !showDescription && isEditing
          ? ''
          : 'tw-absolute tw-opacity-0'
      "
    >
      <div
        class="-tw-mt-[6px] tw-flex tw-w-full tw-flex-grow tw-items-center tw-gap-2"
      >
        <v-textarea
          v-model="newDescription"
          placeholder="Enter a description..."
          class="tw-flex-grow tw-p-2 tw-text-xs sm:tw-text-sm"
          autofocus
          :rows="1"
          auto-grow
          hide-details
        ></v-textarea>
        <v-btn
          icon
          :small="isPhone"
          @click="cancelEditing"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-btn icon :small="isPhone" color="primary" @click="saveDescription"
          ><v-icon>mdi-check</v-icon></v-btn
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { put } from "@/utils"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { Event } from "@/types"

const props = defineProps<{
  event: Event
  canEdit: boolean
}>()

const emit = defineEmits<{
  "update:event": [event: Event]
}>()

const mainStore = useMainStore()
const { isPhone } = useDisplayHelpers()

const isEditing = ref(false)
const newDescription = ref(props.event.description ?? "")

const showDescription = computed(
  () => props.event.description && !isEditing.value
)

const saveDescription = () => {
  const oldEvent = { ...props.event }
  const newEvent = { ...props.event, description: newDescription.value }

  const eventPayload = {
    name: props.event.name,
    duration: props.event.duration,
    dates: props.event.dates,
    type: props.event.type,
    description: newDescription.value,
  }

  emit("update:event", newEvent)
  isEditing.value = false
  put(`/events/${props.event._id ?? ""}`, eventPayload).catch((err: unknown) => {
    console.error(err)
    mainStore.showError(
      "Failed to save description! Please try again later."
    )
    emit("update:event", { ...oldEvent })
  })
}

const cancelEditing = () => {
  newDescription.value = props.event.description ?? ""
  isEditing.value = false
}
</script>
