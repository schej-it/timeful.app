export interface ThirdPartyShellEnvironment {
  VITE_ENABLE_THIRD_PARTY_SHELL?: string
}

export function isThirdPartyShellEnabled(
  env: ThirdPartyShellEnvironment = import.meta.env,
  hostname: string = window.location.hostname
): boolean {
  const configuredValue = env.VITE_ENABLE_THIRD_PARTY_SHELL?.trim().toLowerCase()

  if (configuredValue) {
    return configuredValue !== "false"
  }

  return hostname !== "127.0.0.1" && hostname !== "localhost"
}
