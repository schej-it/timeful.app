<template>
  <div
    class="tw-h-full tw-w-full tw-cursor-pointer tw-overflow-hidden tw-rounded-md tw-border-2 tw-border-solid tw-bg-surface"
    :class="unsaved ? 'tw-border-light-green' : 'tw-border-gray'"
  >
    <div
      class="tw-h-full tw-w-full tw-overflow-hidden tw-text-ellipsis tw-p-1 tw-text-xs"
      :style="{ backgroundColor: backgroundColor }"
    >
      <div v-if="!titleOnly">
        <div class="ph-no-capture tw-font-medium" :class="fontColor">
          {{ signUpBlock.name }}
        </div>
        <div class="ph-no-capture tw-font-medium" :class="fontColor">
          ({{ numberResponses }}/{{ signUpBlock.capacity }})
        </div>
      </div>
      <div v-else>
        <div class="tw-text-xs tw-italic" :class="fontColor">
          {{ title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SignUpCalendarBlock",

  props: {
    signUpBlock: { type: Object, default: null },
    unsaved: { type: Boolean, default: false },
    titleOnly: { type: Boolean, default: false },
    title: { type: String, default: "" },
  },

  data: () => ({}),

  computed: {
    numberResponses() {
      return this.signUpBlock && this.signUpBlock.responses
        ? this.signUpBlock.responses.length
        : 0
    },
    backgroundColor() {
      const capacity = this.signUpBlock ? this.signUpBlock.capacity : 1
      const frac = this.numberResponses / capacity
      const green = "#00994C"
      let alpha = Math.floor(frac * (255 - 30))
        .toString(16)
        .toUpperCase()
        .substring(0, 2)
        .padStart(2, "0")
      if (frac == 1) {
        alpha = "FF"
      }
      return `${green}${alpha}`
    },
    fontColor() {
      return this.numberResponses == this.signUpBlock?.capacity && !this.unsaved
        ? "tw-text-white"
        : "tw-text-text-muted"
    },
  },

  methods: {},
}
</script>
