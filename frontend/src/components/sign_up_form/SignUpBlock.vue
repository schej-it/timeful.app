<template>
  <div
    :data-id="signUpBlock._id"
    class="tw-flex tw-flex-col tw-rounded-md tw-border-[1px] tw-p-4"
    :class="unsaved ? 'tw-border-light-green' : 'tw-border-border-default'"
  >
    <div class="tw-flex tw-items-start tw-justify-between mb-1">
      <div
        v-if="!isEditingName"
        class="tw-flex tw-items-center tw-gap-2 tw-font-medium"
      >
        <div>
          {{ isEditing ? newName : signUpBlock.name }}
        </div>
        <div>
          (<span :class="!hasCapacity && 'tw-text-green'">{{ numberResponses }}/{{ signUpBlock.capacity }}</span>)
        </div>
        <v-btn v-if="isEditing" icon x-small @click="isEditingName = true">
          <v-icon x-small>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <div
        v-else
        class="-tw-mt-[6px] tw-flex tw-w-full tw-items-center tw-gap-2"
      >
        <v-text-field
          v-model="newName"
          dense
          hide-details
          autofocus
          @keyup.enter="saveName"
        ></v-text-field>
        <v-btn icon small @click="cancelEditName">
          <v-icon small>mdi-undo</v-icon>
        </v-btn>
        <v-btn icon small color="primary" @click="saveName">
          <v-icon small>mdi-check</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="tw-text-xs tw-italic tw-text-text-muted">
      {{ timeRangeString }}
    </div>
    <div v-if="isOwner" class="tw-mt-4 tw-flex tw-items-center tw-gap-4">
      <div class="tw-text-xs">People per slot</div>
      <div class="tw-flex tw-h-4 tw-items-center">
        <div v-if="isEditing" class="-tw-mt-2 tw-w-20">
          <v-select
            :value="signUpBlock.capacity"
            @input="
              $emit('update:signUpBlock', {
                ...signUpBlock,
                capacity: $event,
              })
            "
            class="tw-text-xs"
            menu-props="auto"
            :items="capacityOptions"
            hide-details
            dense
          ></v-select>
        </div>
        <div v-else class="tw-text-xs">{{ signUpBlock.capacity }}</div>
      </div>
    </div>

    <div v-if="signUpBlock.responses" class="tw-mt-2">
      <div
        v-for="(response, i) in signUpBlock.responses"
        :key="i"
        class="tw-relative tw-flex tw-items-center"
      >
        <div class="tw-ml-1 tw-mr-2">
          <v-avatar v-if="response.user.picture != '' && (!anonymize || response.user._id == authUser._id)" :size="16">
            <img
              v-if="response.user.picture"
              :src="response.user.picture"
              referrerpolicy="no-referrer"
            />
          </v-avatar>
          <v-avatar v-else :size="16">
            <v-icon small>mdi-account</v-icon>
          </v-avatar>
        </div>
        <div v-if="!anonymize || response.user._id == authUser._id" class="tw-transition-all tw-text-sm">
          {{ response.user.firstName + " " + response.user.lastName }}
        </div>
        <div v-else class="tw-transition-all tw-text-sm tw-italic">Attendee</div>
      </div>
    </div>

    <div v-if="isEditing" class="tw-mt-2">
      <a
        class="tw-text-xs tw-text-red"
        text
        @click="$emit('delete:signUpBlock', signUpBlock._id)"
        >Delete slot</a
      >
    </div>

    <div v-if="!isOwner && hasCapacity && !infoOnly" class="tw-mt-2">
      <a
        class="tw-text-xs tw-text-green"
        text
        @click="joinSlot"
        >+ Join this slot</a
      >
    </div>
  </div>
</template>

<script>
import { getStartEndDateString } from "@/utils"
import { mapState } from "vuex"

export default {
  name: "SignUpBlock",

  props: {
    signUpBlock: { type: Object, required: true },
    isEditing: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false },
    unsaved: { type: Boolean, default: false },
    infoOnly: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
  },

  data: () => ({
    capacityOptions: [...Array(100).keys()].map((i) => i + 1),
    isEditingName: false,
    newName: "",
  }),

  computed: {
    ...mapState(["authUser"]),
    timeRangeString() {
      return getStartEndDateString(
        this.signUpBlock.startDate,
        this.signUpBlock.endDate
      )
    },
    hasCapacity() {
      return (
        !this.signUpBlock.responses ||
        this.signUpBlock.capacity > this.signUpBlock.responses.length
      )
    },
    numberResponses() {
      return this.signUpBlock.responses ? this.signUpBlock.responses.length : 0
    },
    anonymize() {
      return this.anonymous && !this.isOwner
    }
  },

  methods: {
    saveName() {
      this.$emit("update:signUpBlock", {
        ...this.signUpBlock,
        name: this.newName,
      })
      this.isEditingName = false
    },
    cancelEditName() {
      this.newName = this.signUpBlock.name
      this.isEditingName = false
    },
    joinSlot() {
      if (!this.isOwner) this.$emit('signUpForBlock', this.signUpBlock)
    }
  },

  watch: {
    signUpBlock: {
      immediate: true,
      handler(newVal) {
        this.newName = newVal.name
      },
    },
  },
}
</script>
