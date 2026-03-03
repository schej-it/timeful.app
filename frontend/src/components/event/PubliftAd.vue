<template>
  <div
    v-if="showAd"
    class="tw-relative tw-rounded-lg tw-bg-light-gray tw-p-3 tw-pt-5"
  >
    <span
      class="tw-absolute tw-left-1/2 tw-top-0 tw--translate-x-1/2 tw--translate-y-1/2 tw-rounded-full tw-border tw-border-light-gray-stroke tw-bg-off-white tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-medium tw-uppercase tw-tracking-wide tw-text-dark-gray"
    >
      advertisement
    </span>
    <slot />
  </div>
</template>

<script>
import { get } from "@/utils"
import { guestUserId } from "@/constants"
import { mapGetters } from "vuex"

export default {
  name: "PubliftAd",

  props: {
    ownerId: { type: String, default: "" },
  },

  data: () => ({
    ownerIsPremium: false,
    ownerLoaded: false,
  }),

  async mounted() {
    if (this.ownerId && this.ownerId !== guestUserId) {
      try {
        const res = await get(`/users/${this.ownerId}/is-premium`)
        this.ownerIsPremium = res.isPremium
      } catch {
        this.ownerIsPremium = false
      }
    }
    this.ownerLoaded = true
  },

  computed: {
    ...mapGetters(["isPremiumUser"]),
    showAd() {
      return this.ownerLoaded && !this.ownerIsPremium && !this.isPremiumUser
    },
  },
}
</script>
