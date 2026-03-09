<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    :width="version === 'v2' ? 680 : 600"
    content-class="tw-m-0"
  >
    <!-- ==================== V1 PAYWALL ==================== -->
    <v-card
      v-if="version === 'v1'"
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
      </div>
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
      <div
        class="tw-flex tw-h-8 tw-w-full tw-items-center tw-justify-start tw-pb-4"
      >
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
    </v-card>

    <!-- ==================== V2 PAYWALL ==================== -->
    <v-card
      v-else
      class="tw-relative tw-rounded-lg tw-p-4 tw-pb-4 sm:tw-p-8 sm:tw-pb-6"
    >
      <v-btn
        absolute
        @click="$emit('input', false)"
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <!-- Header -->
      <div class="tw-mb-6 tw-flex tw-flex-col tw-items-start tw-gap-2">
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
            v-else-if="upgradeDialogType === upgradeDialogTypes.REMOVE_ADS"
          >
            Upgrade to remove ads. Your payment helps us keep the site running.
          </template>
          <template v-else>
            Create unlimited events with Timeful Premium. Your payment helps us
            keep the site running.
          </template>
        </div>
      </div>

      <!-- Monthly / Yearly toggle -->
      <div class="tw-mb-4 tw-flex tw-items-center tw-justify-center">
        <SlideToggle
          class="tw-w-full"
          :value="v2BillingCycle"
          :options="v2BillingOptions"
          @input="v2BillingCycle = $event"
        >
          <template #option-yearly="{ active }">
            <span class="tw-line-clamp-1">Yearly</span>
            <span
              v-if="yearlyDiscount > 0"
              class="tw-whitespace-nowrap tw-rounded-full tw-bg-light-green tw-px-1.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
              >{{ yearlyDiscount }}% OFF</span
            >
          </template>
        </SlideToggle>
      </div>

      <!-- Plan comparison cards -->
      <div
        class="tw-mb-5 tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-gap-4"
      >
        <!-- Free plan -->
        <div
          class="tw-flex tw-flex-1 tw-flex-col tw-rounded-lg tw-border tw-border-light-gray-stroke tw-p-5"
        >
          <div class="tw-mb-1 tw-text-xl tw-font-medium">Free</div>
          <div class="tw-mb-4 tw-text-xs tw-font-medium tw-text-dark-gray">
            Limited use
          </div>
          <div class="tw-mb-1 tw-text-4xl tw-font-medium">$0</div>
          <div class="tw-mb-5 tw-text-xs tw-text-dark-gray">Free, forever</div>
          <ul class="tw-m-0 tw-mb-5 tw-list-none tw-space-y-2.5 tw-p-0">
            <li
              v-for="item in freeFeatures"
              :key="item"
              class="tw-flex tw-items-start tw-text-sm tw-text-very-dark-gray"
            >
              <v-icon small class="tw-mr-2 tw-mt-0.5 tw-text-gray"
                >mdi-check</v-icon
              >
              {{ item }}
            </li>
          </ul>
          <v-btn depressed disabled class="tw-mt-auto">
            <span class="tw-text-very-dark-gray">Your current plan</span>
          </v-btn>
        </div>

        <!-- Premium plan -->
        <div
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-rounded-lg tw-border-2 tw-border-light-green tw-p-5"
          style="box-shadow: 0 10px 30px -5px rgba(76, 175, 80, 0.3)"
          :style="{
            background: `linear-gradient( 135deg, rgba(76, 175, 80, 0.1) 0%, #fff 50%, rgba(76, 175, 80, 0.1) 100%)`,
          }"
        >
          <!-- <div
            class="tw-absolute -tw-top-3 tw-left-1/2 -tw-translate-x-1/2 tw-whitespace-nowrap tw-rounded-full tw-bg-light-green tw-px-3 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Recommended
          </div> -->
          <div class="tw-mb-1 tw-text-xl tw-font-semibold">
            <span
              class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
              >Premium</span
            >
          </div>
          <div class="tw-mb-4 tw-text-xs tw-font-medium tw-text-dark-gray">
            Unlock everything
          </div>
          <div class="tw-relative tw-mb-1">
            <span class="tw-text-4xl tw-font-medium">{{
              v2ActivePrice ? formattedPrice(v2ActivePrice) : "..."
            }}</span>
            <span class="tw-text-sm tw-text-dark-gray">/mo</span>
          </div>
          <div class="tw-mb-5 tw-text-xs tw-text-dark-gray">
            {{
              v2BillingCycle === "yearly" ? "Billed annually" : "Billed monthly"
            }}
          </div>

          <ul class="tw-m-0 tw-mb-5 tw-list-none tw-space-y-2.5 tw-p-0">
            <li
              v-for="item in premiumFeatures"
              :key="item.text"
              class="tw-flex tw-items-start tw-text-sm tw-text-very-dark-gray"
            >
              <v-icon small class="tw-mr-2 tw-mt-0.5 tw-text-light-green"
                >mdi-check</v-icon
              >
              <span v-html="item.html"></span>
            </li>
          </ul>

          <v-btn
            color="primary"
            block
            :dark="!loadingCheckoutUrl[v2ActivePrice?.id]"
            :disabled="loadingCheckoutUrl[v2ActivePrice?.id]"
            :loading="loadingCheckoutUrl[v2ActivePrice?.id]"
            @click="handleUpgrade(v2ActivePrice)"
          >
            Upgrade
          </v-btn>
        </div>
      </div>

      <!-- Student checkbox -->
      <div class="tw-flex tw-h-8 tw-w-full tw-items-center tw-justify-start">
        <v-checkbox
          id="student-checkbox-v2"
          v-model="isStudent"
          dense
          hide-details
        >
        </v-checkbox>
        <label
          for="student-checkbox-v2"
          class="tw-flex tw-cursor-pointer tw-select-none tw-flex-col tw-text-sm tw-text-very-dark-gray"
        >
          <span class="tw-text-sm">I'm a student</span>
          <span v-if="isStudent" class="tw-text-xs tw-text-dark-gray">
            Pinky promise that you're actually a student?
          </span>
        </label>
      </div>
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
import SlideToggle from "@/components/SlideToggle.vue"

export default {
  name: "UpgradeDialog",
  components: {
    AlreadyDonatedDialog,
    StudentProofDialog,
    SlideToggle,
  },
  props: {
    value: { type: Boolean, required: true },
    version: {
      type: String,
      default: "v2",
      validator: (v) => ["v1", "v2"].includes(v),
    },
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

      v2BillingCycle: "yearly",
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
    isRemoveAdsMode() {
      return this.upgradeDialogType === upgradeDialogTypes.REMOVE_ADS
    },
    freeFeatures() {
      const events = "Create 3 events per month"
      const ads = "Ads displayed on all your events"
      return this.isRemoveAdsMode ? [ads, events] : [events, ads]
    },
    premiumFeatures() {
      const events = {
        text: "events",
        html: 'Create <span class="rdt-h">unlimited events</span> per month',
      }
      const noAdsOwn = {
        text: "no-ads-own",
        html: '<span class="rdt-h">No ads</span> displayed on your events',
      }
      const noAdsOthers = {
        text: "no-ads-others",
        html: "<span class=\"rdt-h\">Don't see ads</span> on other people's events",
      }
      return this.isRemoveAdsMode
        ? [noAdsOwn, noAdsOthers, events]
        : [events, noAdsOwn, noAdsOthers]
    },
    v2BillingOptions() {
      return [
        { text: "Monthly", value: "monthly", style: { minWidth: "150px" } },
        { text: "Yearly", value: "yearly", style: { minWidth: "150px" } },
      ]
    },
    v2ActivePrice() {
      if (this.v2BillingCycle === "yearly") {
        return this.isStudent ? this.yearlyStudentPrice : this.yearlyPrice
      }
      return this.isStudent ? this.monthlyStudentPrice : this.monthlyPrice
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

      if (!this.authUser) {
        const upgradeParams = {
          priceId: price.id,
          isSubscription: price.recurring !== null,
          originUrl: window.location.href,
        }
        this.$emit("input", false)
        this.$router.push({
          name: "sign-up",
          query: {
            redirect: "upgrade",
            upgradeParams: JSON.stringify(upgradeParams),
          },
        })
        return
      }

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
