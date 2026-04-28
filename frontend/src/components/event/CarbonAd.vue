<template>
  <div
    v-if="showAd"
    ref="adContainer"
    class="tw-mb-6 tw-mt-6 tw-flex tw-justify-center sm:tw-mb-6 sm:tw-mt-0"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { get } from "@/utils"
import { guestUserId } from "@/constants"

const props = defineProps<{
  ownerId?: string
}>()

const mainStore = useMainStore()
const { isPremiumUser } = storeToRefs(mainStore)

const adContainer = ref<HTMLDivElement>()
const ownerIsPremium = ref(false)
const ownerLoaded = ref(false)

async function loadOwnerStatus() {
  if (props.ownerId && props.ownerId !== guestUserId) {
    try {
      const res = await get<{ isPremium: boolean }>(`/users/${props.ownerId}/is-premium`)
      ownerIsPremium.value = res.isPremium
    } catch {
      ownerIsPremium.value = false
    }
  }
  ownerLoaded.value = true

  await new Promise(resolve => setTimeout(resolve, 0))
  if (showAd.value) {
    loadCarbonAd()
  }
}

function loadCarbonAd() {
  const container = adContainer.value
  if (!container) return

  const existing = container.querySelector("#_carbonads_js")
  if (existing) existing.remove()

  const script = document.createElement("script")
  script.async = true
  script.type = "text/javascript"
  script.src =
    "//cdn.carbonads.com/carbon.js?serve=CWBDC2QJ&placement=timefulapp&format=responsive"
  script.id = "_carbonads_js"
  container.appendChild(script)
}

const showAd = computed(() => {
  return ownerLoaded.value && !ownerIsPremium.value && !isPremiumUser.value
})

onMounted(() => {
  void loadOwnerStatus()
})

onBeforeUnmount(() => {
  const existing = adContainer.value?.querySelector("#_carbonads_js")
  if (existing) existing.remove()
})
</script>
