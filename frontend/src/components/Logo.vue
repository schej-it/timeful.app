<template>
  <div
    v-if="type === 'brand'"
    class="tw-flex tw-shrink-0 tw-cursor-pointer tw-select-none tw-items-center"
    :class="isPhone ? 'tw-gap-1.5' : 'tw-gap-2'"
    role="img"
    :aria-label="alt"
  >
    <BrandMark :size="isPhone ? 22 : 26" />
    <span
      class="tw-font-bold tw-leading-none tw-tracking-tight tw-text-black"
      :class="isPhone ? 'tw-text-lg' : 'tw-text-xl'"
      aria-hidden="true"
      ><span class="tw-text-green">2</span>bz<span class="tw-text-green">2</span
      >fill</span
    >
  </div>
  <v-img
    v-else
    :alt="alt"
    class="shrink tw-cursor-pointer"
    contain
    :src="src"
    transition="fade-transition"
    :width="width"
  />
</template>

<script>
import { isPhone } from "@/utils"
import BrandMark from "@/components/BrandMark.vue"

export default {
  name: "Logo",

  components: { BrandMark },

  props: {
    type: {
      type: "brand" | "betterwhen2meet" | "aprilfools",
      default: "brand",
    },
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
    alt() {
      if (this.type === "betterwhen2meet") {
        return "Betterwhen2meet Logo"
      }

      return "2bz2fill"
    },
    src() {
      return require("@/assets/april_fools_logo.png")
    },
    width() {
      return this.isPhone ? 200 : 300
    },
  },
}
</script>
