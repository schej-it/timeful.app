export type AppEnvironment = "development" | "staging" | "production"

export interface AppEnvironmentShape {
  VITE_APP_ENV?: string
}

export function getAppEnvironment(
  env: AppEnvironmentShape = import.meta.env
): AppEnvironment {
  const value = env.VITE_APP_ENV?.trim().toLowerCase()

  switch (value) {
    case "staging":
      return "staging"
    case "production":
      return "production"
    case "development":
    default:
      return "development"
  }
}

export const appEnvironment = getAppEnvironment()
