<template>
  <div class="tw-flex tw-h-screen tw-items-center tw-justify-center tw-p-4">
    <div class="tw-text-center">
      <v-progress-circular
        v-if="!fulfillmentComplete"
        indeterminate
        color="primary"
        size="32"
      ></v-progress-circular>
      <template v-else>
        <div class="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <v-img
            alt="schejie heart"
            src="@/assets/schejie/heart.png"
            transition="fade-transition"
            contain
            class="tw-mb-0 tw-h-[150px] tw-flex-none sm:tw-h-[200px]"
          />
          <div class="tw-text-xl tw-font-medium">
            You've upgraded to <br class="tw-block sm:tw-hidden" />
            <span
              class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
              >Timeful Premium</span
            >!
          </div>
          <div>
            <v-btn color="primary" @click="navigateToRedirectUrl">
              Continue
            </v-btn>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { get, post } from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import confetti from "canvas-confetti"
import type { RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

const router = useRouter()
const mainStore = useMainStore()

const fulfillmentComplete = ref(false)
const redirectUrl = ref("")

function navigateToRedirectUrl() {
  window.location.replace(redirectUrl.value)
}

function fireConfetti() {
  const duration = 15 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval); return;
    }

    const particleCount = 50 * (timeLeft / duration)
    void confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
    void confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  }, 250)
}

async function handleRedirect() {
  const urlParams = new URLSearchParams(window.location.search)
  const upgradeStatus = urlParams.get("upgrade")
  const sessionId = urlParams.get("session_id")
  redirectUrl.value = urlParams.get("redirect_url") ?? ""

  if (!redirectUrl.value) {
    void router.replace({ name: "home" })
    return
  }

  try {
    if (upgradeStatus === "success" && sessionId) {
      await post("/stripe/fulfill-checkout", { sessionId })
      const user = fromRawUser(await get<RawUser>("/user/profile"))
      mainStore.setAuthUser(user)
      fulfillmentComplete.value = true
      fireConfetti()
      posthog.capture("upgrade_success")
    } else {
      navigateToRedirectUrl()
    }
  } catch (err) {
    console.error("Error during Stripe redirect handling:", err)
    navigateToRedirectUrl()
  }
}

onMounted(() => {
  void handleRedirect()
})
</script>
