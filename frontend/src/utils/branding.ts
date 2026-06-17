export interface BrandingEnvironment {
  VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ?: string
}

export function isFormerlyKnownAsSchejEnabled(
  env: BrandingEnvironment = import.meta.env
): boolean {
  const value = env.VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ?.trim().toLowerCase()

  if (!value) {
    return true
  }

  return value !== "false"
}

export const formerlyKnownAsSchejEnabled = isFormerlyKnownAsSchejEnabled()
