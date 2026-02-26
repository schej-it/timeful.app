<template>
  <div
    v-if="showAd"
    ref="adContainer"
    class="tw-mb-6 tw-mt-6 tw-flex tw-justify-center sm:tw-mb-6 sm:tw-mt-0"
  ></div>
</template>

<script>
import { get } from "@/utils"
import { guestUserId } from "@/constants"
import { mapGetters } from "vuex"

export default {
  name: "CarbonAd",

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

    await this.$nextTick()
    if (this.showAd) {
      this.loadCarbonAd()
    }
  },

  beforeDestroy() {
    const existing = this.$refs.adContainer?.querySelector("#_carbonads_js")
    if (existing) existing.remove()
  },

  computed: {
    ...mapGetters(["isPremiumUser"]),
    showAd() {
      return this.ownerLoaded && !this.ownerIsPremium && !this.isPremiumUser
    },
  },

  methods: {
    loadCarbonAd() {
      const container = this.$refs.adContainer
      if (!container) return

      const script = document.createElement("script")
      script.async = true
      script.type = "text/javascript"
      script.src =
        "//cdn.carbonads.com/carbon.js?serve=CWBDC2QJ&placement=timefulapp&format=responsive"
      script.id = "_carbonads_js"
      container.appendChild(script)
    },
  },
}
</script>
