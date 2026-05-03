<template>
  <v-dialog
    :model-value="modelValue"
    :width="version === 'v2' ? 680 : 600"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <!-- ==================== V1 PAYWALL ==================== -->
    <v-card
      v-if="version === 'v1'"
      class="tw-relative tw-rounded-lg tw-p-4 tw-pb-2 sm:tw-p-8 sm:tw-pb-4"
    >
      <v-btn
        absolute
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
        @click="emit('update:modelValue', false)"
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
                ? !loadingCheckoutUrl[monthlyStudentPrice?.id ?? '']
                : !loadingCheckoutUrl[monthlyPrice?.id ?? '']
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[monthlyPrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[monthlyPrice?.id ?? '']
            "
            @click="
              isStudent && monthlyStudentPrice
                ? handleUpgrade(monthlyStudentPrice)
                : monthlyPrice
                  ? handleUpgrade(monthlyPrice)
                  : undefined
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
                ? !loadingCheckoutUrl[yearlyStudentPrice?.id ?? '']
                : !loadingCheckoutUrl[yearlyPrice?.id ?? '']
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[yearlyPrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[yearlyPrice?.id ?? '']
            "
            @click="
              isStudent && yearlyStudentPrice
                ? handleUpgrade(yearlyStudentPrice)
                : yearlyPrice
                  ? handleUpgrade(yearlyPrice)
                  : undefined
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
                ? !loadingCheckoutUrl[lifetimeStudentPrice?.id ?? '']
                : !loadingCheckoutUrl[lifetimePrice?.id ?? '']
            "
            :disabled="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id ?? '']
                : loadingCheckoutUrl[lifetimePrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id ?? '']
                : loadingCheckoutUrl[lifetimePrice?.id ?? '']
            "
            @click="
              isStudent && lifetimeStudentPrice
                ? handleUpgrade(lifetimeStudentPrice)
                : lifetimePrice
                  ? handleUpgrade(lifetimePrice)
                  : undefined
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
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
        @click="emit('update:modelValue', false)"
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
          v-model="v2BillingCycle"
          class="tw-w-full"
          :options="v2BillingOptions"
        >
          <template #option-yearly>
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
          <div class="tw-relative tw-mb-1 tw-flex tw-items-baseline tw-gap-1.5">
            <span
              v-if="v2BillingCycle === 'yearly' && v2MonthlyPrice"
              class="tw-text-lg tw-text-dark-gray tw-line-through"
              >{{ formattedPrice(v2MonthlyPrice) }}</span
            >
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
            :dark="!loadingCheckoutUrl[v2ActivePrice?.id ?? '']"
            :disabled="!v2ActivePrice || loadingCheckoutUrl[v2ActivePrice.id ?? '']"
            :loading="loadingCheckoutUrl[v2ActivePrice?.id ?? '']"
            @click="v2ActivePrice && handleUpgrade(v2ActivePrice)"
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

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { storeToRefs } from "pinia"
import { useRouter } from "vue-router"
import { get, post } from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { upgradeDialogTypes } from "@/constants"
import AlreadyDonatedDialog from "./AlreadyDonatedDialog.vue"
import StudentProofDialog from "./StudentProofDialog.vue"
import SlideToggle from "@/components/SlideToggle.vue"

interface StripePrice {
  id: string
  unit_amount: number
  recurring?: {
    interval: string
  } | null
}

const props = defineProps<{
  modelValue: boolean
  version?: "v1" | "v2"
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const router = useRouter()
const mainStore = useMainStore()
const { featureFlagsLoaded, pricingPageConversion, authUser, upgradeDialogType, upgradeDialogData } =
  storeToRefs(mainStore)

const lifetimePrice = ref<StripePrice | null>(null)
const monthlyPrice = ref<StripePrice | null>(null)
const yearlyPrice = ref<StripePrice | null>(null)
const lifetimeStudentPrice = ref<StripePrice | null>(null)
const monthlyStudentPrice = ref<StripePrice | null>(null)
const yearlyStudentPrice = ref<StripePrice | null>(null)

const loadingCheckoutUrl = ref<Record<string, boolean>>({})
const showDonatedDialog = ref(false)
const isStudent = ref(false)
const showStudentProofDialog = ref(false)

const showMonthly = ref(true)
const showYearly = ref(true)
const showLifetime = ref(false)

const v2BillingCycle = ref("yearly")

const yearlyDiscount = computed(() => {
  if (isStudent.value) {
    if (!yearlyStudentPrice.value || !monthlyStudentPrice.value) return 0
    return (
      100 -
      Math.round(
        (yearlyStudentPrice.value.unit_amount /
          12 /
          monthlyStudentPrice.value.unit_amount) *
          100
      )
    )
  }

  if (!yearlyPrice.value || !monthlyPrice.value) return 0
  return (
    100 -
    Math.round(
      (yearlyPrice.value.unit_amount / 12 / monthlyPrice.value.unit_amount) *
        100
    )
  )
})

const isRemoveAdsMode = computed(
  () => upgradeDialogType.value === upgradeDialogTypes.REMOVE_ADS
)

const freeFeatures = computed(() => {
  const events = "Create 3 events per month"
  const ads = "Ads displayed on all your events"
  return isRemoveAdsMode.value ? [ads, events] : [events, ads]
})

const premiumFeatures = computed(() => {
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
  return isRemoveAdsMode.value
    ? [noAdsOwn, noAdsOthers, events]
    : [events, noAdsOwn, noAdsOthers]
})

const v2BillingOptions = computed(() => [
  { text: "Monthly", value: "monthly", style: { minWidth: "150px" } },
  { text: "Yearly", value: "yearly", style: { minWidth: "150px" } },
])

const v2ActivePrice = computed(() => {
  if (v2BillingCycle.value === "yearly") {
    return isStudent.value ? yearlyStudentPrice.value : yearlyPrice.value
  }
  return isStudent.value ? monthlyStudentPrice.value : monthlyPrice.value
})

const v2MonthlyPrice = computed(() =>
  isStudent.value ? monthlyStudentPrice.value : monthlyPrice.value
)

const pricesShown = computed(() => {
  const parts: string[] = []
  if (showMonthly.value) {
    if (isStudent.value && monthlyStudentPrice.value) {
      parts.push(
        `MONTHLY (Student): ${formattedPrice(monthlyStudentPrice.value)}/mo`
      )
    } else {
      parts.push(`MONTHLY: ${formattedPrice(monthlyPrice.value)}/mo`)
    }
  }
  if (showYearly.value) {
    if (isStudent.value && yearlyStudentPrice.value) {
      console.log(
        "yearlyStudentPrice",
        formattedPrice(yearlyStudentPrice.value)
      )
      parts.push(
        `YEARLY (Student): ${formattedPrice(yearlyStudentPrice.value)}/mo`
      )
    } else {
      parts.push(`YEARLY: ${formattedPrice(yearlyPrice.value)}/mo`)
    }
  }
  if (showLifetime.value) {
    if (isStudent.value && lifetimeStudentPrice.value) {
      parts.push(
        `LIFETIME (Student): ${formattedPrice(lifetimeStudentPrice.value)}`
      )
    } else {
      parts.push(`LIFETIME: ${formattedPrice(lifetimePrice.value)}`)
    }
  }
  return parts.join(", ")
})

function formattedPrice(price: StripePrice | null) {
  if (!price) return ""
  let unitAmount = price.unit_amount / 100
  if (price.recurring?.interval === "year") {
    unitAmount = Math.floor((price.unit_amount / 100 / 12) * 100) / 100
  }
  return (
    "$" +
    (unitAmount % 1 === 0 ? unitAmount.toFixed(0) : unitAmount.toFixed(2))
  )
}

async function init() {
  if (!lifetimePrice.value || !monthlyPrice.value) {
    await fetchPrice()
  }
}

async function fetchPrice() {
  interface PriceResponse {
    lifetime: StripePrice | null
    monthly: StripePrice | null
    yearly: StripePrice | null
    lifetimeStudent: StripePrice | null
    monthlyStudent: StripePrice | null
    yearlyStudent: StripePrice | null
  }

  let res: PriceResponse
  if (import.meta.env.DEV) {
    res = {
      lifetime: { id: "price_dev_lifetime", unit_amount: 9999, recurring: null },
      monthly: { id: "price_dev_monthly", unit_amount: 999, recurring: { interval: "month" } },
      yearly: { id: "price_dev_yearly", unit_amount: 7999, recurring: { interval: "year" } },
      lifetimeStudent: { id: "price_dev_lifetime_student", unit_amount: 4999, recurring: null },
      monthlyStudent: { id: "price_dev_monthly_student", unit_amount: 499, recurring: { interval: "month" } },
      yearlyStudent: { id: "price_dev_yearly_student", unit_amount: 3999, recurring: { interval: "year" } },
    }
  } else {
    res = await get<PriceResponse>(`/stripe/price?exp=${pricingPageConversion.value}`)
  }

  const {
    lifetime,
    monthly,
    yearly,
    lifetimeStudent,
    monthlyStudent,
    yearlyStudent,
  } = res
  lifetimePrice.value = lifetime
  monthlyPrice.value = monthly
  yearlyPrice.value = yearly
  lifetimeStudentPrice.value = lifetimeStudent
  monthlyStudentPrice.value = monthlyStudent
  yearlyStudentPrice.value = yearlyStudent
}

async function handleUpgrade(price: StripePrice) {
  // if (isStudent.value) {
  //   showStudentProofDialog.value = true
  //   posthog?.capture("student_upgrade_attempt", { price })
  //   return
  // }
  void posthog.capture("upgrade_clicked", {
    price: formattedPrice(price),
  })

  if (!authUser.value) {
    const upgradeParams = {
      priceId: price.id,
      isSubscription: price.recurring !== null,
      originUrl: window.location.href,
    }
    emit("update:modelValue", false)
    void router.push({
      name: "sign-up",
      query: {
        redirect: "upgrade",
        upgradeParams: JSON.stringify(upgradeParams),
      },
    })
    return
  }

  loadingCheckoutUrl.value[price.id] = true
  try {
    let originUrl = window.location.href
    if (upgradeDialogData.value) {
      if (upgradeDialogType.value === upgradeDialogTypes.SCHEDULE_EVENT) {
        originUrl = `${originUrl}?scheduled_event=${encodeURIComponent(
          JSON.stringify((upgradeDialogData.value as { scheduledEvent?: unknown }).scheduledEvent)
        )}`
      }
    }
    const res = await post<{ url: string }>("/stripe/create-checkout-session", {
      priceId: price.id,
      userId: authUser.value._id,
      isSubscription: price.recurring !== null,
      originUrl,
    })
    window.location.href = res.url
  } catch (e) {
    console.error(e)
    mainStore.showError(
      "There was an error generating a checkout url. Please try again later."
    )
  } finally {
    loadingCheckoutUrl.value[price.id] = false
  }
}

watch(isStudent, (val) => {
  if (val) {
    void posthog.capture("student_pricing_viewed", {
      prices: pricesShown.value,
    })
  }
})

watch(
  featureFlagsLoaded,
  () => {
    void init()
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  () => {
    if (props.modelValue) {
      void post("/analytics/upgrade-dialog-viewed", {
        userId: authUser.value?._id ?? posthog.get_distinct_id(),
        price: pricesShown.value,
        type: upgradeDialogType.value,
      })
      void posthog.capture("upgrade_dialog_viewed", {
        price: pricesShown.value,
        type: upgradeDialogType.value,
      })
    }
  }
)
</script>
