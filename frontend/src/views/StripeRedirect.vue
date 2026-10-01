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

<script>
import { get, post } from "@/utils"
import { mapMutations } from "vuex"
import confetti from "canvas-confetti"

export default {
  name: "StripeRedirect",
  data() {
    return {
      fulfillmentComplete: false,
      redirectUrl: "",
    }
  },
  methods: {
    ...mapMutations(["setAuthUser"]), // Assuming setAuthUser might be needed if fulfillment updates user state
    async handleRedirect() {
      const urlParams = new URLSearchParams(window.location.search)
      const upgradeStatus = urlParams.get("upgrade")
      const sessionId = urlParams.get("session_id")
      const checkoutId = urlParams.get("checkout_id")
      this.redirectUrl = urlParams.get("redirect_url")

      if (!this.redirectUrl) {
        this.$router.replace({ name: "home" })
        return
      }

      try {
        if (upgradeStatus === "success" && (checkoutId || sessionId)) {
          // Fulfill checkout
          if (checkoutId) {
            await this.fulfillPolarCheckout(checkoutId)
          } else {
            await post("/stripe/fulfill-checkout", { sessionId })
          }
          const user = await get("/user/profile")
          this.setAuthUser(user)
          this.fulfillmentComplete = true
          this.fireConfetti()
          this.$posthog.capture("upgrade_success")
        } else {
          // Upgrade cancelled, navigate to redirect url
          this.navigateToRedirectUrl()
        }
      } catch (err) {
        // Error during checkout fulfillment, navigate to redirect url
        console.error("Error during checkout redirect handling:", err)
        this.navigateToRedirectUrl()
      }
    },
    /** Fulfills a Polar checkout, retrying while the payment is still processing */
    async fulfillPolarCheckout(checkoutId) {
      const maxAttempts = 10
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await post("/polar/fulfill-checkout", { checkoutId })
        if (res.status === "fulfilled") return
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      throw new Error("Timed out waiting for checkout to be fulfilled")
    },
    navigateToRedirectUrl() {
      window.location.replace(this.redirectUrl)
    },
    fireConfetti() {
      var duration = 15 * 1000
      var animationEnd = Date.now() + duration
      var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min
      }

      var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        var particleCount = 50 * (timeLeft / duration)
        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)
    },
  },
  mounted() {
    this.handleRedirect()
  },
}
</script>
