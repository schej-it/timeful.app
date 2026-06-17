import { computed, ref, watch, type Ref } from "vue"
import { storeToRefs } from "pinia"
import { useRouter } from "vue-router"
import { post } from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import {
  buildUpgradeDialogPriceSummary,
  buildUpgradeOriginUrl,
  formatStripePrice,
  getActiveUpgradeDialogPrice,
  getReferenceMonthlyPrice,
  getUpgradeDialogBillingOptions,
  getUpgradeDialogFreeFeatures,
  getUpgradeDialogPremiumFeatures,
  getYearlyDiscount,
  type StripePrice,
  type UpgradeDialogBillingCycle,
} from "@/composables/pricing/upgradeDialogModels"
import {
  createCheckoutSession,
  fetchStripePrices,
} from "@/utils/services/PricingService"

export interface UseUpgradeDialogStateOptions {
  modelValue: Ref<boolean>
  closeDialog: () => void
}

export const useUpgradeDialogState = ({
  modelValue,
  closeDialog,
}: UseUpgradeDialogStateOptions) => {
  const router = useRouter()
  const mainStore = useMainStore()
  const {
    authUser,
    featureFlagsLoaded,
    pricingPageConversion,
    upgradeDialogData,
    upgradeDialogType,
  } = storeToRefs(mainStore)

  const lifetimePrice = ref<StripePrice | null>(null)
  const monthlyPrice = ref<StripePrice | null>(null)
  const yearlyPrice = ref<StripePrice | null>(null)
  const lifetimeStudentPrice = ref<StripePrice | null>(null)
  const monthlyStudentPrice = ref<StripePrice | null>(null)
  const yearlyStudentPrice = ref<StripePrice | null>(null)

  const loadingCheckoutUrl = ref<Record<string, boolean>>({})
  const showDonatedDialog = ref(false)
  const showStudentProofDialog = ref(false)
  const isStudent = ref(false)
  const trackedCurrentOpen = ref(false)
  const showMonthly = true
  const showYearly = true
  const showLifetime = false
  const v2BillingCycle = ref<UpgradeDialogBillingCycle>("yearly")

  const currentPrices = computed(() => ({
    lifetime: lifetimePrice.value,
    monthly: monthlyPrice.value,
    yearly: yearlyPrice.value,
    lifetimeStudent: lifetimeStudentPrice.value,
    monthlyStudent: monthlyStudentPrice.value,
    yearlyStudent: yearlyStudentPrice.value,
  }))

  const yearlyDiscount = computed(() =>
    getYearlyDiscount(
      isStudent.value ? monthlyStudentPrice.value : monthlyPrice.value,
      isStudent.value ? yearlyStudentPrice.value : yearlyPrice.value
    )
  )

  const freeFeatures = computed(() =>
    getUpgradeDialogFreeFeatures(upgradeDialogType.value)
  )

  const premiumFeatures = computed(() =>
    getUpgradeDialogPremiumFeatures(upgradeDialogType.value)
  )

  const v2BillingOptions = getUpgradeDialogBillingOptions()

  const v2ActivePrice = computed(() =>
    getActiveUpgradeDialogPrice({
      billingCycle: v2BillingCycle.value,
      isStudent: isStudent.value,
      prices: currentPrices.value,
    })
  )

  const v2MonthlyPrice = computed(() =>
    getReferenceMonthlyPrice({
      isStudent: isStudent.value,
      prices: currentPrices.value,
    })
  )

  const pricesShown = computed(() =>
    buildUpgradeDialogPriceSummary({
      isStudent: isStudent.value,
      showMonthly,
      showYearly,
      showLifetime,
      prices: currentPrices.value,
    })
  )

  const assignFetchedPrices = async () => {
    const prices = await fetchStripePrices(pricingPageConversion.value)

    lifetimePrice.value = prices.lifetime
    monthlyPrice.value = prices.monthly
    yearlyPrice.value = prices.yearly
    lifetimeStudentPrice.value = prices.lifetimeStudent
    monthlyStudentPrice.value = prices.monthlyStudent
    yearlyStudentPrice.value = prices.yearlyStudent
  }

  const init = async () => {
    if (!lifetimePrice.value || !monthlyPrice.value) {
      await assignFetchedPrices()
    }
  }

  const trackDialogViewed = () => {
    if (!modelValue.value || trackedCurrentOpen.value) {
      return
    }

    trackedCurrentOpen.value = true

    void post("/analytics/upgrade-dialog-viewed", {
      userId: authUser.value?._id ?? posthog.get_distinct_id(),
      price: pricesShown.value,
      type: upgradeDialogType.value,
    })
    posthog.capture("upgrade_dialog_viewed", {
      price: pricesShown.value,
      type: upgradeDialogType.value,
    })
  }

  const handleStudentToggle = (value: boolean | null) => {
    isStudent.value = value === true

    if (isStudent.value) {
      posthog.capture("student_pricing_viewed", {
        prices: pricesShown.value,
      })
    }
  }

  const redirectToSignUpForUpgrade = (price: StripePrice) => {
    closeDialog()

    void router.push({
      name: "sign-up",
      query: {
        redirect: "upgrade",
        upgradeParams: JSON.stringify({
          priceId: price.id,
          isSubscription: price.recurring !== null,
          originUrl: window.location.href,
        }),
      },
    })
  }

  const redirectToCheckout = (url: string) => {
    window.location.assign(url)
  }

  const handleDialogVisibilityChange = (isOpen: boolean) => {
    if (!isOpen) {
      trackedCurrentOpen.value = false
      return
    }

    void init()
    trackDialogViewed()
  }

  const handleUpgrade = async (price: StripePrice) => {
    posthog.capture("upgrade_clicked", {
      price: formatStripePrice(price),
    })

    if (!authUser.value) {
      redirectToSignUpForUpgrade(price)
      return
    }

    const userId = authUser.value._id
    if (!userId) {
      mainStore.showError(
        "There was an error generating a checkout url. Please try again later."
      )
      return
    }

    loadingCheckoutUrl.value[price.id] = true

    try {
      const res = await createCheckoutSession({
        priceId: price.id,
        userId,
        isSubscription: price.recurring !== null,
        originUrl: buildUpgradeOriginUrl(
          window.location.href,
          upgradeDialogType.value,
          upgradeDialogData.value
        ),
      })
      redirectToCheckout(res.url)
    } catch (error) {
      console.error(error)
      mainStore.showError(
        "There was an error generating a checkout url. Please try again later."
      )
    } finally {
      loadingCheckoutUrl.value[price.id] = false
    }
  }

  watch(
    featureFlagsLoaded,
    (loaded) => {
      if (!loaded) {
        return
      }

      void init()
    },
    { immediate: true }
  )

  watch(modelValue, handleDialogVisibilityChange, { immediate: true })

  return {
    freeFeatures,
    handleStudentToggle,
    handleUpgrade,
    isStudent,
    loadingCheckoutUrl,
    monthlyPrice,
    monthlyStudentPrice,
    premiumFeatures,
    showDonatedDialog,
    showLifetime,
    showMonthly,
    showStudentProofDialog,
    showYearly,
    upgradeDialogType,
    v2ActivePrice,
    v2BillingCycle,
    v2BillingOptions,
    v2MonthlyPrice,
    yearlyDiscount,
    yearlyPrice,
    yearlyStudentPrice,
    lifetimePrice,
    lifetimeStudentPrice,
  }
}
