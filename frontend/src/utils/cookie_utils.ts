// Cookie consent utilities
import { Temporal } from "temporal-polyfill"
import type { DataLayerObject } from "@gtm-support/core"
import { readonly, ref } from "vue"
import { UTC } from "@/constants"

export const COOKIE_CONSENT_KEY = "cookieConsent"

export interface CookieConsentPreferences {
  necessary: boolean
  analytics: boolean
  advertising: boolean
}

export interface CookieConsent {
  timestamp: string
  preferences: CookieConsentPreferences
}

export const DEFAULT_COOKIE_CONSENT_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  analytics: true,
  advertising: true,
}

declare global {
  interface Window {
    dataLayer?: DataLayerObject[]
  }
}

const cookieConsentVersionState = ref(0)

const getCookieConsentStorage = (): Storage | undefined => {
  if (typeof localStorage === "undefined") {
    return undefined
  }

  return localStorage
}

const normalizeCookieConsentPreferences = (preferences: {
  analytics?: unknown
  advertising?: unknown
  necessary?: unknown
}): CookieConsentPreferences => ({
  necessary: true,
  analytics: Boolean(preferences.analytics),
  advertising: Boolean(preferences.advertising),
})

export const cookieConsentVersion = readonly(cookieConsentVersionState)

export function getDefaultCookieConsentPreferences(): CookieConsentPreferences {
  return { ...DEFAULT_COOKIE_CONSENT_PREFERENCES }
}

export function getCookieConsent(): CookieConsent | null {
  try {
    const consent = getCookieConsentStorage()?.getItem(COOKIE_CONSENT_KEY)
    if (!consent) return null

    return JSON.parse(consent) as CookieConsent
  } catch (error) {
    console.error("Error parsing cookie consent:", error)
    return null
  }
}

export function getCookieConsentPreferences(): CookieConsentPreferences {
  const consent = getCookieConsent()

  if (!consent) {
    return getDefaultCookieConsentPreferences()
  }

  return {
    ...getDefaultCookieConsentPreferences(),
    ...consent.preferences,
    necessary: true,
  }
}

export function setCookieConsent(preferences: {
  analytics?: unknown
  advertising?: unknown
  necessary?: unknown
}): CookieConsent {
  const consentData: CookieConsent = {
    timestamp: Temporal.Now.plainDateISO()
      .toZonedDateTime({
        timeZone: UTC,
        plainTime: "00:00:00",
      })
      .toInstant()
      .toString(),
    preferences: normalizeCookieConsentPreferences(preferences),
  }

  getCookieConsentStorage()?.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData))
  cookieConsentVersionState.value += 1
  return consentData
}

export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent()
  return consent?.preferences.analytics === true
}

export function hasAdvertisingConsent(): boolean {
  const consent = getCookieConsent()
  return consent?.preferences.advertising === true
}

export function hasGivenConsent(): boolean {
  return getCookieConsent() !== null
}

// Initialize Google Tag Manager consent
export function initializeGTMConsent(): void {
  window.dataLayer ??= []

  const consent = getCookieConsent()
  if (consent) {
    window.dataLayer.push({
      event: "consent_default",
      analytics_consent: consent.preferences.analytics ? "granted" : "denied",
      ad_consent: consent.preferences.advertising ? "granted" : "denied",
    })
  } else {
    window.dataLayer.push({
      event: "consent_default",
      analytics_consent: "granted",
      ad_consent: "granted",
    })
  }
}
