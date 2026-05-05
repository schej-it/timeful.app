<template>
  <div
    v-if="shouldShowAd"
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

<script setup lang="ts">
import { computed, watch, onMounted } from "vue"
import { useMainStore } from "@/stores/main"
import { upgradeDialogTypes } from "@/constants"
import { adsEnabled } from "@/utils/ads"

const props = defineProps<{
  showAd?: boolean
  fuseId?: string
}>()

const mainStore = useMainStore()
const shouldShowAd = computed(() => adsEnabled && props.showAd)

function removeAds() {
  mainStore.showUpgradeDialog({ type: upgradeDialogTypes.REMOVE_ADS })
}

function registerZone() {
  const fuseId = props.fuseId
  if (!fuseId) return
  
  window.fusetag ??= { que: [], registerZone: () => void 0 }
  
  window.fusetag.que.push(function () {
    window.fusetag?.registerZone?.(fuseId)
  })
}

watch(
  shouldShowAd,
  (val) => {
    if (val && props.fuseId) {
      setTimeout(() => {
        registerZone()
      }, 0)
    }
  }
)

onMounted(() => {
  if (shouldShowAd.value && props.fuseId) {
    setTimeout(() => {
      registerZone()
    }, 0)
  }
})
</script>
