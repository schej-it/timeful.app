export interface SignInAvailabilityEnvironment {
  VITE_ENABLE_SIGN_IN?: string
}

export function isSignInEnabled(
  env: SignInAvailabilityEnvironment = import.meta.env
): boolean {
  const value = env.VITE_ENABLE_SIGN_IN?.trim().toLowerCase()

  if (!value) {
    return true
  }

  return value !== "false"
}

export const signInEnabled = isSignInEnabled()
