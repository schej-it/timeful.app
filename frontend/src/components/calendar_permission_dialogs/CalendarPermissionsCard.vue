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
      class="tw-mb-8 tw-flex tw-flex-col tw-gap-4 tw-text-sm tw-text-text-secondary"
    >
      <div>Allow us to display the names/times of your calendar events</div>
      <div>
        Allow us to display calendar events on all calendars, not just your
        primary calendar
      </div>
    </div>

    <div class="tw-flex">
      <!-- <v-spacer /> -->
      <v-btn v-if="cancelLabel != ''" @click="$emit('cancel')" text class="tw-mr-2 tw-flex-1">
        {{ cancelLabel }}
      </v-btn>
      <v-btn @click="$emit('allow')" class="tw-flex-1 tw-bg-green" dark>
        {{ allowLabel }}
      </v-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: "CalendarPermissionsCard",

  props: {
    cancelLabel: { type: String, default: "Cancel" },
    allowLabel: { type: String, default: "Allow" },
  },
}
</script>
