import type { User } from "@/types"

export interface FreemiumEnvironment {
  [key: string]: string | undefined
  VITE_ENABLE_FREEMIUM?: string
}

export function isFreemiumEnabled(
  env: FreemiumEnvironment = import.meta.env
): boolean {
  const value = env.VITE_ENABLE_FREEMIUM?.trim().toLowerCase()

  if (!value) {
    return true
  }

  return value !== "false"
}

export const isPremiumUser = (authUser: User | null | undefined): boolean => {
  if (!authUser) return false

  if (authUser.stripeCustomerId) {
    if (authUser.isPremium !== null && authUser.isPremium !== undefined) {
      return authUser.isPremium
    }
    return true
  }
  return false
}

export const viewerHasPremiumAccess = (
  authUser: User | null | undefined,
  env: FreemiumEnvironment = import.meta.env
): boolean => {
  if (!isFreemiumEnabled(env)) {
    return true
  }

  return isPremiumUser(authUser)
}

export const freemiumEnabled = isFreemiumEnabled()
