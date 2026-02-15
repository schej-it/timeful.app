<template>
  <div class="tw-mt-1 tw-max-w-full sm:tw-mt-2 sm:tw-max-w-[calc(100%-236px)]">
    <div
      v-if="showDescription"
      class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-border-default tw-bg-surface-muted tw-p-2 tw-text-xs tw-font-normal tw-text-text-secondary hover:tw-bg-surface-variant sm:tw-text-sm"
    >
      <div class="tw-grow tw-space-y-1">
        <div
          class="tw-min-h-6 tw-leading-6"
          v-for="(line, i) in event.description.split('\n')"
          :key="i"
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
      class="-tw-ml-2 tw-mt-0 tw-w-min tw-px-2 tw-text-text-muted"
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
          @click="
            newDescription = event.description
            isEditing = false
          "
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

<script>
import { mapActions } from "vuex"
import { isPhone, put } from "@/utils"

export default {
  name: "EventDescription",

  props: {
    event: {
      type: Object,
      required: true,
    },
    canEdit: {
      type: Boolean,
      required: true,
    },
  },

  data() {
    return {
      isEditing: false,
      newDescription: this.event.description ?? "",
      lineHeight: 28,
    }
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
    showDescription() {
      return this.event.description && !this.isEditing
    },
  },

  methods: {
    ...mapActions(["showError"]),
    saveDescription() {
      const oldEvent = { ...this.event }

      const newEvent = {
        ...this.event,
        description: this.newDescription,
      }

      const eventPayload = {
        name: this.event.name,
        duration: this.event.duration,
        dates: this.event.dates,
        type: this.event.type,
        description: this.newDescription,
      }
      
      this.$emit("update:event", newEvent)
      this.isEditing = false
      put(`/events/${this.event._id}`, eventPayload).catch((err) => {
        console.error(err)
        this.showError("Failed to save description! Please try again later.")
        this.$emit("update:event", {
          ...oldEvent,
        })
      })
    },
  },
}
</script>
