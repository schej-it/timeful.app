<template>
  <div class="tw-space-y-8 tw-p-6">
    <section id="event-description-preview-fixture" class="tw-max-w-xl">
      <h1 class="tw-text-xl tw-font-semibold">Event description preview</h1>
      <EventDescription
        :event="previewEvent"
        :can-edit="true"
        @update:event="updatePreviewEvent"
      />
    </section>

    <section id="event-description-edit-fixture" class="tw-max-w-xl">
      <h2 class="tw-text-xl tw-font-semibold">Event description edit</h2>
      <EventDescription
        :event="editEvent"
        :can-edit="true"
        @update:event="updateEditEvent"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Temporal } from "temporal-polyfill"
import EventDescription from "@/components/event/EventDescription.vue"
import { durations, eventTypes, UTC } from "@/constants"
import type { Event } from "@/types"

const makeFixtureEvent = (description?: string): Event => ({
  _id: `fixture-${description ? "preview" : "edit"}`,
  ownerId: "owner-1",
  name: "Fixture event",
  type: eventTypes.SPECIFIC_DATES,
  duration: durations.ONE_HOUR,
  dates: [Temporal.PlainDate.from("2026-05-18")],
  timeSeed: Temporal.Instant.from("2026-05-18T12:00:00Z").toZonedDateTimeISO(UTC),
  description,
})

const previewEvent = ref<Event>(makeFixtureEvent("klklk"))
const editEvent = ref<Event>(makeFixtureEvent())

const updatePreviewEvent = (event: Event) => {
  previewEvent.value = event
}

const updateEditEvent = (event: Event) => {
  editEvent.value = event
}

defineOptions({ name: 'AppTest' })
</script>
