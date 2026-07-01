<template>
  <div>
    <div class="tw-mb-3 tw-flex tw-items-center tw-gap-2">
      <span class="tw-text-sm">Status:</span>
      <v-chip
        x-small
        label
        :color="statusColor"
        text-color="white"
        class="tw-capitalize"
      >
        {{ statusLabel }}
      </v-chip>
    </div>

    <div class="tw-mb-4 tw-text-sm tw-text-very-dark-gray">
      Seats in use: <strong>{{ org.seatCount || 0 }}</strong>
    </div>

    <div v-if="isOwner" class="tw-flex tw-flex-wrap tw-gap-2">
      <v-btn
        v-if="!isSubscribed"
        color="primary"
        :loading="loading"
        @click="subscribe"
      >
        Subscribe
      </v-btn>
      <v-btn v-else outlined :loading="loading" @click="manageBilling">
        Manage billing
      </v-btn>
    </div>
    <div v-else class="tw-text-sm tw-text-very-dark-gray">
      Only the organization owner can manage billing.
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex"
import {
  createTeamCheckout,
  getOrgBillingPortal,
} from "@/utils/services/OrganizationService"

export default {
  name: "OrgBilling",
  props: {
    org: { type: Object, required: true },
  },
  data() {
    return {
      loading: false,
    }
  },
  computed: {
    isOwner() {
      return this.org.myRole === "owner"
    },
    isSubscribed() {
      return (
        this.org.subscriptionStatus === "active" ||
        this.org.subscriptionStatus === "past_due"
      )
    },
    statusLabel() {
      switch (this.org.subscriptionStatus) {
        case "active":
          return "Active"
        case "past_due":
          return "Past due"
        case "canceled":
          return "Canceled"
        default:
          return "No subscription"
      }
    },
    statusColor() {
      switch (this.org.subscriptionStatus) {
        case "active":
          return "green"
        case "past_due":
          return "orange"
        case "canceled":
          return "red"
        default:
          return "grey"
      }
    },
  },
  methods: {
    ...mapActions(["showError"]),
    async subscribe() {
      this.loading = true
      try {
        const { url } = await createTeamCheckout(
          this.org._id,
          window.location.href
        )
        window.location.href = url
      } catch (err) {
        this.showError("There was a problem starting checkout!")
        console.error(err)
        this.loading = false
      }
    },
    async manageBilling() {
      this.loading = true
      try {
        const { url } = await getOrgBillingPortal(
          this.org._id,
          window.location.href
        )
        window.location.href = url
      } catch (err) {
        this.showError("There was a problem opening the billing portal!")
        console.error(err)
        this.loading = false
      }
    },
  },
}
</script>
