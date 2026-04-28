<template>
  <div v-if="showAd" class="tw-flex tw-cursor-pointer" @click="navigateToAd">
    <v-img
      alt="tomotime ad"
      :src="adImageUrl"
      width="0"
      transition="fade-transition"
      class="tw-relative tw-shadow-md sm:tw-shadow-none"
      ><div
        class="tw-absolute tw-left-0 tw-top-0 tw-ml-0 tw-mt-0 tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-br-lg tw-bg-gray tw-bg-opacity-60 tw-text-xs sm:tw-ml-[6px] sm:tw-mt-[5px] sm:tw-h-10 sm:tw-w-10 sm:tw-rounded-tl-lg"
      >
        AD
      </div></v-img
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { get } from "@/utils"
import { guestUserId } from "@/constants"
import { posthog } from "@/plugins/posthog"
import type { User } from "@/types"

defineOptions({ name: 'EventAdvertisement' })

const props = defineProps<{
  ownerId?: string
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const link = ref("https://tomotime.app")
const eduOnly = ref(true)
const owner = ref<User | null>(null)

const adImageUrl = computed(() => {
  return isPhone.value
    ? new URL('@/assets/ads/tomotime_mobile.png', import.meta.url).href
    : new URL('@/assets/ads/tomotime.png', import.meta.url).href
})

async function loadOwner() {
  if (props.ownerId && props.ownerId !== guestUserId) {
    owner.value = await get<User>(`/users/${props.ownerId}`)
  }
}

function navigateToAd() {
  posthog.capture("Clicked ad", {
    link: link.value,
  })
  window.open(link.value, "_blank")
}

function isEduEmail(email: string): boolean {
  const split = email.split(".")
  return split[split.length - 1] === "edu"
}

const showAd = computed(() => {
  if (eduOnly.value) {
    return (
      (authUser.value?.email && isEduEmail(authUser.value.email)) ??
      (owner.value?.email && isEduEmail(owner.value.email))
    )
  } else {
    return true
  }
})

onMounted(() => {
  void loadOwner()
})
</script>
