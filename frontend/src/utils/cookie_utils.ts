// Cookie consent utilities
import type { DataLayerObject } from "@gtm-support/core"

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

declare global {
  interface Window {
    dataLayer?: DataLayerObject[]
  }
}

export function getCookieConsent(): CookieConsent | null {
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) return null

    return JSON.parse(consent) as CookieConsent
  } catch (error) {
    console.error("Error parsing cookie consent:", error)
    return null
  }
}

export function setCookieConsent(preferences: {
  analytics?: unknown
  advertising?: unknown
}): CookieConsent {
  const consentData: CookieConsent = {
    timestamp: new Date().toISOString(),
    preferences: {
      necessary: true, // Always true
      analytics: Boolean(preferences.analytics),
      advertising: Boolean(preferences.advertising),
    },
  }

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData))
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
