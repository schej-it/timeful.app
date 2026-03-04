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
import { mapGetters } from "vuex"

export default {
  name: "PubliftAd",

  props: {
    ownerIsPremium: { type: Boolean, default: false },
    fuseId: { type: String, required: true },
  },

  watch: {
    showAd: {
      immediate: true,
      handler(val) {
        if (val) this.$nextTick(() => this.registerZone())
      },
    },
  },

  computed: {
    ...mapGetters(["isPremiumUser"]),
    showAd() {
      return !this.ownerIsPremium && !this.isPremiumUser
    },
  },

  methods: {
    registerZone() {
      const fuseId = this.fuseId
      const fusetag = window.fusetag || (window.fusetag = { que: [] })
      fusetag.que.push(function () {
        fusetag.registerZone(fuseId)
      })
    },
  },
}
</script>
