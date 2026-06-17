import { get, post } from "@/utils"
import type {
  StripePriceCollection,
  UpgradeRedirectParams,
} from "@/composables/pricing/upgradeDialogModels"

export interface CheckoutSessionRequest extends UpgradeRedirectParams {
  userId: string
}

interface CheckoutSessionResponse {
  url: string
}

const devStripePrices: StripePriceCollection = {
  lifetime: { id: "price_dev_lifetime", unit_amount: 9999, recurring: null },
  monthly: {
    id: "price_dev_monthly",
    unit_amount: 999,
    recurring: { interval: "month" },
  },
  yearly: {
    id: "price_dev_yearly",
    unit_amount: 7999,
    recurring: { interval: "year" },
  },
  lifetimeStudent: {
    id: "price_dev_lifetime_student",
    unit_amount: 4999,
    recurring: null,
  },
  monthlyStudent: {
    id: "price_dev_monthly_student",
    unit_amount: 499,
    recurring: { interval: "month" },
  },
  yearlyStudent: {
    id: "price_dev_yearly_student",
    unit_amount: 3999,
    recurring: { interval: "year" },
  },
}

export async function fetchStripePrices(
  pricingExperiment: string
): Promise<StripePriceCollection> {
  if (import.meta.env.DEV) {
    return devStripePrices
  }

  return get<StripePriceCollection>(`/stripe/price?exp=${pricingExperiment}`)
}

export async function createCheckoutSession(
  payload: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  return post<CheckoutSessionResponse>("/stripe/create-checkout-session", payload)
}
