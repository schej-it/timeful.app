<template>
  <div
    class="tw-flex tw-w-full tw-cursor-pointer tw-flex-col tw-overflow-hidden tw-rounded-md tw-border-[1px] tw-bg-surface tw-p-4 tw-text-left tw-shadow-sm tw-transition-all sm:tw-p-6"
    :class="{
      'tw-border-green': toggled,
      'tw-border-border-default': !toggled,
    }"
    @click="() => (toggled = !toggled)"
  >
    <div
      class="tw-flex tw-flex-row tw-content-center tw-justify-between tw-text-base"
    >
      <div class="tw-mr-4 tw-font-medium" v-html="question"></div>
      <v-icon
        size="x-large"
        :class="`${
          toggled ? 'tw-rotate-45 tw-text-green' : 'tw-rotate-0 tw-text-gray'
        }`"
        >mdi-plus</v-icon
      >
    </div>

    <v-expand-transition>
      <div v-if="toggled">
        <div class="tw-pt-4 tw-text-sm sm:tw-pt-6">
          <div v-html="answer"></div>
          <div class="tw-flex tw-flex-col tw-gap-2">
            <div
              v-for="(point, index) in points"
              class="tw-flex tw-items-center"
            >
              <div
                class="tw-mr-2 tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-green tw-text-white"
              >
                {{ index + 1 }}
              </div>
              <div>{{ point }}</div>
            </div>
          </div>
          <div
            v-if="authRequired"
            class="tw-mt-6 tw-text-sm tw-font-medium tw-text-text-muted"
          >
            *
            <a @click.stop="$emit('signIn')" class="tw-text-green tw-underline"
              >Sign in</a
            >
            to use this feature
          </div>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script>
export default {
  name: "FAQ",

  props: {
    question: { type: String, required: true },
    answer: { type: String },
    points: { type: Array },
    authRequired: { type: Boolean, default: false },
  },

  data: () => ({
    toggled: false,
  }),

  computed: {},

  methods: {},
}
</script>
