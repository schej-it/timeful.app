<template>
  <v-dialog v-model="dialog" max-width="400px" content-class="tw-m-0">
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Upgrade Required</span>
        <v-spacer />
        <v-btn
          absolute
          @click="dialog = false"
          icon
          class="tw-right-0 tw-mr-2 tw-self-center"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="tw-text-text-secondary">
        Teams are only available on the Timeful organization plan. Book a call
        with the founder to learn about how to upgrade.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false">Close</v-btn>
        <v-btn color="primary" @click="bookCall">Book a call</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "TeamsNotReadyDialog",
  props: {
    value: Boolean,
  },
  computed: {
    dialog: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit("input", val)
      },
    },
  },
  methods: {
    bookCall() {
      this.$posthog?.capture("book_call_for_organization_plan_clicked")
      window.open(
        "https://cal.com/jonathan-liu/timeful-organization-plan",
        "_blank"
      )
      this.dialog = false
    },
  },
}
</script>
