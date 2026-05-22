export type AppEnvironment = "development" | "staging" | "production"

export interface AppEnvironmentShape {
  VITE_APP_ENV?: string
}

export function getAppEnvironment(
  env: AppEnvironmentShape = import.meta.env
): AppEnvironment {
  const value = env.VITE_APP_ENV?.trim().toLowerCase()

  if (value === "staging" || value === "production") {
    return value
  }

  return "development"
}

export const appEnvironment = getAppEnvironment()
