<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    width="600"
    content-class="tw-m-0"
  >
    <v-card
      class="tw-relative tw-rounded-lg tw-p-4 tw-pb-2 sm:tw-p-8 sm:tw-pb-4"
    >
      <v-btn
        absolute
        @click="$emit('input', false)"
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <div class="tw-mb-4 tw-flex tw-flex-col tw-items-start tw-gap-4">
        <h2 class="tw-text-xl tw-font-medium">
          Upgrade to
          <span
            class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
            >Timeful Premium</span
          >
        </h2>
        <div class="tw-text-sm tw-font-medium tw-text-dark-gray">
          <template
            v-if="upgradeDialogType === upgradeDialogTypes.CREATE_EVENT"
          >
            You've run out of free events. Upgrade to create unlimited events.
            <br class="tw-hidden sm:tw-block" />
            Your payment helps us keep the site running.
          </template>
          <template
            v-else-if="upgradeDialogType === upgradeDialogTypes.SCHEDULE_EVENT"
          >
            Upgrade to schedule events with Timeful. Your payment helps us keep
            the site running.
          </template>
          <template
            v-else-if="
              upgradeDialogType === upgradeDialogTypes.UPGRADE_MANUALLY
            "
          >
            Create unlimited events with Timeful Premium. Your payment helps us
            keep the site running.
          </template>
        </div>
        <!-- <ul
          class="tw-inline-block tw-space-y-0.5 tw-p-0 tw-text-sm tw-font-medium tw-text-very-dark-gray"
        >
          <li class="tw-flex tw-items-center">
            <v-icon class="tw-mr-2 tw-text-light-green">mdi-check</v-icon>
            <span>Unlimited events</span>
          </li>
          <li class="tw-flex tw-items-center">
            <v-icon class="tw-mr-2 tw-text-light-green">mdi-check</v-icon>
            <span>Unlimited availability groups</span>
          </li>
          <li class="tw-flex tw-items-center">
            <v-icon class="tw-mr-2 tw-text-light-green">mdi-check</v-icon>
            <span>Any new premium features we add</span>
          </li>
        </ul> -->
      </div>
      <!-- <div
        v-if="isStudent"
        class="tw-mb-8 tw-rounded-lg tw-border tw-border-light-gray-stroke tw-p-4"
      >
        <div class="tw-mb-4 tw-text-sm tw-font-medium tw-text-dark-gray">
          Timeful is free for students! But you have to prove it. And make sure
          to spread Timeful to as many of your friends as possible. Pinky
          promise.
        </div>
        <div class="tw-text-sm tw-font-medium tw-text-dark-gray">
          Email
          <span class="tw-font-medium tw-text-green tw-underline"
            >contact@timeful.app</span
          >
          from your student email with:
          <ul class="tw-list-decimal tw-py-4 tw-pl-4">
            <li>Email address you use for Timeful</li>
            <li>Proof of enrollment</li>
          </ul>
          and we'll get back to you within 24 hours (but probably sooner). The
          subject of your email should be "I AM A STUDENT".
        </div>
      </div> -->
      <div
        class="tw-mb-8 tw-flex tw-flex-col tw-gap-1 sm:tw-flex-row sm:tw-gap-4"
      >
        <div
          v-if="showMonthly"
          class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green/20 tw-p-4"
        >
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-px-2 tw-py-1 tw-text-sm tw-font-medium"
          >
            Monthly
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(monthlyStudentPrice)
                  : formattedPrice(monthlyPrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="monthlyPrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            Per month.<br />Billed monthly.
          </div>
          <v-btn
            class="tw-mb-0.5"
            color="primary"
            outlined
            block
            :dark="
              isStudent
                ? !loadingCheckoutUrl[monthlyStudentPrice?.id]
                : !loadingCheckoutUrl[monthlyPrice?.id]
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id]
                : loadingCheckoutUrl[monthlyPrice?.id]
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id]
                : loadingCheckoutUrl[monthlyPrice?.id]
            "
            @click="
              isStudent
                ? handleUpgrade(monthlyStudentPrice)
                : handleUpgrade(monthlyPrice)
            "
          >
            Upgrade
          </v-btn>
        </div>
        <div
          v-if="showYearly"
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green tw-bg-white tw-p-4 tw-shadow-lg"
        >
          <div
            class="tw-absolute -tw-top-3 tw-rounded-full tw-bg-light-green tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Save {{ yearlyDiscount }}%
          </div>
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-bg-light-green/10 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-light-green"
          >
            Yearly
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(yearlyStudentPrice)
                  : formattedPrice(yearlyPrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="yearlyPrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            Per month.<br />Billed annually.
          </div>
          <v-btn
            class="tw-mb-0.5"
            color="primary"
            block
            :dark="
              isStudent
                ? !loadingCheckoutUrl[yearlyStudentPrice?.id]
                : !loadingCheckoutUrl[yearlyPrice?.id]
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id]
                : loadingCheckoutUrl[yearlyPrice?.id]
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id]
                : loadingCheckoutUrl[yearlyPrice?.id]
            "
            @click="
              isStudent
                ? handleUpgrade(yearlyStudentPrice)
                : handleUpgrade(yearlyPrice)
            "
          >
            Upgrade
          </v-btn>
        </div>
        <div
          v-if="showLifetime"
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green tw-bg-white tw-p-4 tw-shadow-lg"
        >
          <div
            class="tw-absolute -tw-top-3 tw-rounded-full tw-bg-light-green tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Limited time offer
          </div>
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-bg-light-green/10 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-light-green"
          >
            Lifetime access
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-dark-gray tw-line-through"
                >$100</span
              >
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(lifetimeStudentPrice)
                  : formattedPrice(lifetimePrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="lifetimePrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            One-time payment.<br />No subscription.
          </div>
          <v-btn
            class="tw-mb-0.5"
            color="primary"
            block
            :dark="
              isStudent
                ? !loadingCheckoutUrl[lifetimeStudentPrice?.id]
                : !loadingCheckoutUrl[lifetimePrice?.id]
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id]
                : loadingCheckoutUrl[lifetimePrice?.id]
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id]
                : loadingCheckoutUrl[lifetimePrice?.id]
            "
            @click="
              isStudent
                ? handleUpgrade(lifetimeStudentPrice)
                : handleUpgrade(lifetimePrice)
            "
          >
            Upgrade
          </v-btn>
        </div>
      </div>
      <div class="tw-flex tw-w-full tw-items-center tw-justify-start tw-pb-4">
        <v-checkbox
          id="student-checkbox"
          v-model="isStudent"
          dense
          hide-details
        >
        </v-checkbox>
        <label
          for="student-checkbox"
          class="tw-flex tw-cursor-pointer tw-select-none tw-flex-col tw-text-sm tw-text-very-dark-gray"
        >
          <span class="tw-text-sm">I'm a student</span>
          <span v-if="isStudent" class="tw-text-xs tw-text-dark-gray">
            Pinky promise that you're actually a student?
          </span>
        </label>
      </div>
      <!--<div
        class="tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-4 tw-text-center"
      >
        <div
          class="tw-cursor-pointer tw-py-2 tw-text-xs tw-font-medium tw-text-dark-gray tw-underline"
          @click="showDonatedDialog = true"
        >
          I already donated :)
        </div>
      </div>-->
    </v-card>

    <AlreadyDonatedDialog v-model="showDonatedDialog" />
    <StudentProofDialog v-model="showStudentProofDialog" />
  </v-dialog>
</template>

<script>
import { get, post } from "@/utils"
import { mapState, mapActions } from "vuex"
import { upgradeDialogTypes } from "@/constants"
import AlreadyDonatedDialog from "./AlreadyDonatedDialog.vue"
import StudentProofDialog from "./StudentProofDialog.vue"

export default {
  name: "UpgradeDialog",
  components: {
    AlreadyDonatedDialog,
    StudentProofDialog,
  },
  props: {
    value: { type: Boolean, required: true },
  },

  data() {
    return {
      lifetimePrice: null,
      monthlyPrice: null,
      yearlyPrice: null,
      lifetimeStudentPrice: null,
      monthlyStudentPrice: null,
      yearlyStudentPrice: null,

      loadingCheckoutUrl: {},
      showDonatedDialog: false,
      isStudent: false,
      showStudentProofDialog: false,

      showMonthly: true,
      showYearly: true,
      showLifetime: false,
    }
  },

  computed: {
    ...mapState([
      "featureFlagsLoaded",
      "pricingPageConversion",
      "authUser",
      "upgradeDialogType",
      "upgradeDialogData",
    ]),
    upgradeDialogTypes() {
      return upgradeDialogTypes
    },
    yearlyDiscount() {
      if (this.isStudent) {
        if (!this.yearlyStudentPrice || !this.monthlyStudentPrice) return 0
        return (
          100 -
          Math.round(
            (this.yearlyStudentPrice.unit_amount /
              12 /
              this.monthlyStudentPrice.unit_amount) *
              100
          )
        )
      }

      if (!this.yearlyPrice || !this.monthlyPrice) return 0
      return (
        100 -
        Math.round(
          (this.yearlyPrice.unit_amount / 12 / this.monthlyPrice.unit_amount) *
            100
        )
      )
    },
    pricesShown() {
      let pricesShown = []
      // Monthly
      if (this.showMonthly) {
        if (this.isStudent && this.monthlyStudentPrice) {
          pricesShown.push(
            `MONTHLY (Student): ${this.formattedPrice(
              this.monthlyStudentPrice
            )}/mo`
          )
        } else {
          pricesShown.push(
            `MONTHLY: ${this.formattedPrice(this.monthlyPrice)}/mo`
          )
        }
      }
      // Yearly
      if (this.showYearly) {
        if (this.isStudent && this.yearlyStudentPrice) {
          console.log(
            "yearlyStudentPrice",
            this.formattedPrice(this.yearlyStudentPrice)
          )
          pricesShown.push(
            `YEARLY (Student): ${this.formattedPrice(
              this.yearlyStudentPrice
            )}/mo`
          )
        } else {
          pricesShown.push(
            `YEARLY: ${this.formattedPrice(this.yearlyPrice)}/mo`
          )
        }
      }
      // Lifetime
      if (this.showLifetime) {
        if (this.isStudent && this.lifetimeStudentPrice) {
          pricesShown.push(
            `LIFETIME (Student): ${this.formattedPrice(
              this.lifetimeStudentPrice
            )}`
          )
        } else {
          pricesShown.push(
            `LIFETIME: ${this.formattedPrice(this.lifetimePrice)}`
          )
        }
      }
      return pricesShown.join(", ")
    },
  },

  methods: {
    ...mapActions(["showError"]),
    formattedPrice(price) {
      if (!price) return ""
      let unitAmount = price.unit_amount / 100
      if (price.recurring?.interval === "year") {
        unitAmount = Math.floor((price.unit_amount / 100 / 12) * 100) / 100
      }
      return (
        "$" +
        (unitAmount % 1 === 0 ? unitAmount.toFixed(0) : unitAmount.toFixed(2))
      )
    },
    async init() {
      // if (this.featureFlagsLoaded) {
      if (!this.lifetimePrice || !this.monthlyPrice) {
        await this.fetchPrice()
      }
      // }
    },
    async fetchPrice() {
      const res = await get("/stripe/price?exp=" + this.pricingPageConversion)
      const {
        lifetime,
        monthly,
        yearly,
        lifetimeStudent,
        monthlyStudent,
        yearlyStudent,
      } = res
      this.lifetimePrice = lifetime
      this.monthlyPrice = monthly
      this.yearlyPrice = yearly
      this.lifetimeStudentPrice = lifetimeStudent
      this.monthlyStudentPrice = monthlyStudent
      this.yearlyStudentPrice = yearlyStudent
    },
    async handleUpgrade(price) {
      // if (this.isStudent) {
      //   this.showStudentProofDialog = true
      //   this.$posthog.capture("student_upgrade_attempt", {
      //     price: price,
      //   })
      //   return
      // }
      this.$posthog.capture("upgrade_clicked", {
        price: this.formattedPrice(price),
      })
      this.$set(this.loadingCheckoutUrl, price.id, true)
      try {
        let originUrl = window.location.href
        if (this.upgradeDialogData) {
          if (this.upgradeDialogType === upgradeDialogTypes.SCHEDULE_EVENT) {
            originUrl = `${originUrl}?scheduled_event=${encodeURIComponent(
              JSON.stringify(this.upgradeDialogData.scheduledEvent)
            )}`
          }
        }
        const res = await post("/stripe/create-checkout-session", {
          priceId: price.id,
          userId: this.authUser._id,
          isSubscription: price.recurring !== null,
          originUrl: originUrl,
        })
        window.location.href = res.url
      } catch (e) {
        console.error(e)
        this.showError(
          "There was an error generating a checkout url. Please try again later."
        )
      } finally {
        this.$set(this.loadingCheckoutUrl, price.id, false)
      }
    },
  },

  watch: {
    isStudent: {
      handler(val) {
        if (val) {
          this.$posthog.capture("student_pricing_viewed", {
            prices: this.pricesShown,
          })
        }
      },
    },
    featureFlagsLoaded: {
      handler() {
        this.init()
      },
      immediate: true,
    },
    value: {
      handler() {
        if (this.value) {
          post("/analytics/upgrade-dialog-viewed", {
            userId: this.authUser?._id ?? this.$posthog?.get_distinct_id(),
            price: this.pricesShown,
            type: this.upgradeDialogType,
          })
          this.$posthog.capture("upgrade_dialog_viewed", {
            price: this.pricesShown,
            type: this.upgradeDialogType,
          })
        }
      },
    },
  },
}
</script>
