import { upgradeDialogTypes } from "@/constants"
import type { UpgradeDialogType } from "@/constants"

export type UpgradeDialogBillingCycle = "monthly" | "yearly"

export interface StripePrice {
  id: string
  unit_amount: number
  recurring?: {
    interval: string
  } | null
}

export interface StripePriceCollection {
  lifetime: StripePrice | null
  monthly: StripePrice | null
  yearly: StripePrice | null
  lifetimeStudent: StripePrice | null
  monthlyStudent: StripePrice | null
  yearlyStudent: StripePrice | null
}

export interface UpgradeRedirectParams {
  priceId: string
  isSubscription: boolean
  originUrl: string
}

export interface HighlightedTextPart {
  text: string
  highlight?: boolean
}

export interface PremiumFeature {
  text: string
  parts: HighlightedTextPart[]
}

export interface BillingOption {
  text: string
  value: UpgradeDialogBillingCycle
  style: {
    minWidth: string
  }
}

interface BuildPriceSummaryOptions {
  isStudent: boolean
  showMonthly: boolean
  showYearly: boolean
  showLifetime: boolean
  prices: StripePriceCollection
}

const monthlyBillingOption: BillingOption = {
  text: "Monthly",
  value: "monthly",
  style: { minWidth: "150px" },
}

const yearlyBillingOption: BillingOption = {
  text: "Yearly",
  value: "yearly",
  style: { minWidth: "150px" },
}

export const getUpgradeDialogBillingOptions = (): BillingOption[] => [
  monthlyBillingOption,
  yearlyBillingOption,
]

export function formatStripePrice(price: StripePrice | null): string {
  if (!price) return ""

  let unitAmount = price.unit_amount / 100
  if (price.recurring?.interval === "year") {
    unitAmount = Math.floor((price.unit_amount / 100 / 12) * 100) / 100
  }

  return `$${unitAmount % 1 === 0 ? unitAmount.toFixed(0) : unitAmount.toFixed(2)}`
}

export function getYearlyDiscount(
  monthlyPrice: StripePrice | null,
  yearlyPrice: StripePrice | null
): number {
  if (!monthlyPrice || !yearlyPrice) {
    return 0
  }

  return (
    100 -
    Math.round((yearlyPrice.unit_amount / 12 / monthlyPrice.unit_amount) * 100)
  )
}

export function getUpgradeDialogFreeFeatures(
  dialogType: UpgradeDialogType | null
): string[] {
  const events = "Create 3 events per month"
  const ads = "Ads displayed on all your events"

  if (dialogType === upgradeDialogTypes.REMOVE_ADS) {
    return [ads, events]
  }

  return [events, ads]
}

export function getUpgradeDialogPremiumFeatures(
  dialogType: UpgradeDialogType | null
): PremiumFeature[] {
  const events: PremiumFeature = {
    text: "events",
    parts: [
      { text: "Create " },
      { text: "unlimited events", highlight: true },
      { text: " per month" },
    ],
  }
  const noAdsOwn: PremiumFeature = {
    text: "no-ads-own",
    parts: [
      { text: "No ads", highlight: true },
      { text: " displayed on your events" },
    ],
  }
  const noAdsOthers: PremiumFeature = {
    text: "no-ads-others",
    parts: [
      { text: "Don't see ads", highlight: true },
      { text: " on other people's events" },
    ],
  }

  if (dialogType === upgradeDialogTypes.REMOVE_ADS) {
    return [noAdsOwn, noAdsOthers, events]
  }

  return [events, noAdsOwn, noAdsOthers]
}

export function getActiveUpgradeDialogPrice({
  billingCycle,
  isStudent,
  prices,
}: {
  billingCycle: UpgradeDialogBillingCycle
  isStudent: boolean
  prices: StripePriceCollection
}): StripePrice | null {
  if (billingCycle === "yearly") {
    return isStudent ? prices.yearlyStudent : prices.yearly
  }

  return isStudent ? prices.monthlyStudent : prices.monthly
}

export function getReferenceMonthlyPrice({
  isStudent,
  prices,
}: {
  isStudent: boolean
  prices: StripePriceCollection
}): StripePrice | null {
  return isStudent ? prices.monthlyStudent : prices.monthly
}

export function buildUpgradeDialogPriceSummary({
  isStudent,
  showMonthly,
  showYearly,
  showLifetime,
  prices,
}: BuildPriceSummaryOptions): string {
  const parts: string[] = []

  if (showMonthly) {
    if (isStudent && prices.monthlyStudent) {
      parts.push(
        `MONTHLY (Student): ${formatStripePrice(prices.monthlyStudent)}/mo`
      )
    } else {
      parts.push(`MONTHLY: ${formatStripePrice(prices.monthly)}/mo`)
    }
  }

  if (showYearly) {
    if (isStudent && prices.yearlyStudent) {
      parts.push(
        `YEARLY (Student): ${formatStripePrice(prices.yearlyStudent)}/mo`
      )
    } else {
      parts.push(`YEARLY: ${formatStripePrice(prices.yearly)}/mo`)
    }
  }

  if (showLifetime) {
    if (isStudent && prices.lifetimeStudent) {
      parts.push(`LIFETIME (Student): ${formatStripePrice(prices.lifetimeStudent)}`)
    } else {
      parts.push(`LIFETIME: ${formatStripePrice(prices.lifetime)}`)
    }
  }

  return parts.join(", ")
}

export function buildUpgradeOriginUrl(
  currentUrl: string,
  dialogType: UpgradeDialogType | null,
  dialogData: unknown
): string {
  if (
    dialogData &&
    dialogType === upgradeDialogTypes.SCHEDULE_EVENT
  ) {
    return `${currentUrl}?scheduled_event=${encodeURIComponent(
      JSON.stringify(
        (dialogData as { scheduledEvent?: unknown }).scheduledEvent
      )
    )}`
  }

  return currentUrl
}
