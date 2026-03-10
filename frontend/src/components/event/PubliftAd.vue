<template>
  <div
    v-if="showAd"
    class="tw-relative tw-rounded-lg tw-bg-light-gray tw-p-3 tw-pt-5"
  >
    <span
      class="tw-absolute tw-left-1/2 tw-top-0 tw-flex tw-w-[90%] tw--translate-x-1/2 tw--translate-y-1/2 tw-justify-center tw-gap-x-1 tw-rounded-full tw-border tw-border-light-gray-stroke tw-bg-off-white tw-px-2.5 tw-py-0.5"
    >
      <div
        class="tw-text-[10px] tw-font-medium tw-uppercase tw-tracking-wide tw-text-dark-gray"
      >
        advertisement
      </div>
      <div
        class="tw-cursor-pointer tw-select-none tw-text-center tw-text-[10px] tw-font-medium tw-text-blue tw-underline"
        @click.stop="removeAds"
      >
        Remove ads
      </div>
    </span>
    <slot />
  </div>
</template>

<script>
import { mapActions } from "vuex"
import { upgradeDialogTypes } from "@/constants"

export default {
  name: "PubliftAd",

  props: {
    showAd: { type: Boolean, default: false },
    fuseId: { type: String, default: "" },
  },

  mounted() {
    if (this.showAd && this.fuseId) this.$nextTick(() => this.registerZone())
  },

  watch: {
    showAd: {
      handler(val) {
        if (val && this.fuseId) this.$nextTick(() => this.registerZone())
      },
    },
  },

  methods: {
    ...mapActions(["showUpgradeDialog"]),
    removeAds() {
      this.showUpgradeDialog({ type: upgradeDialogTypes.REMOVE_ADS })
    },
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
