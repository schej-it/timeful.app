export interface AdsEnvironment {
  [key: string]: string | undefined
  VITE_ENABLE_ADS?: string
}

export function areAdsEnabled(
  env: AdsEnvironment = import.meta.env
): boolean {
  const value = env.VITE_ENABLE_ADS?.trim().toLowerCase()

  if (!value) {
    return true
  }

  return value !== "false"
}

export const adsEnabled = areAdsEnabled()
