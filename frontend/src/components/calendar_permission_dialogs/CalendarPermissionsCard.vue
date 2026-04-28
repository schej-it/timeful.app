<template>
  <div>
    <div class="tw-text-md tw-mb-4 tw-font-medium">
      We need the following permissions to access your Google Calendar events
    </div>

    <div class="tw-mb-8 tw-ml-4 tw-flex tw-flex-col tw-gap-4">
      <div class="tw-flex tw-gap-2 tw-text-sm">
        <v-img
          src="@/assets/gcal_logo.png"
          class="tw-flex-none"
          height="20"
          width="20"
        />
        <div>View events on all your calendars.</div>
      </div>
      <div class="tw-flex tw-gap-2 tw-text-sm">
        <v-img
          src="@/assets/gcal_logo.png"
          class="tw-flex-none"
          height="20"
          width="20"
        />
        <div>See the list of Google calendars you’re subscribed to.</div>
      </div>
    </div>

    <div class="tw-text-md tw-mb-4 tw-font-medium">These permissions will</div>
    <div
      class="tw-mb-8 tw-flex tw-flex-col tw-gap-4 tw-text-sm tw-text-very-dark-gray"
    >
      <div>Allow us to display the names/times of your calendar events</div>
      <div>
        Allow us to display calendar events on all calendars, not just your
        primary calendar
      </div>
    </div>

    <div class="tw-flex">
      <v-btn
        v-if="cancelLabel != ''"
        text
        class="tw-mr-2 tw-flex-1"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </v-btn>
      <v-btn class="tw-flex-1 tw-bg-green" dark @click="emit('allow')">
        {{ allowLabel }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    cancelLabel?: string
    allowLabel?: string
  }>(),
  { cancelLabel: "Cancel", allowLabel: "Allow" }
)

const emit = defineEmits<{
  cancel: []
  allow: []
}>()
</script>
