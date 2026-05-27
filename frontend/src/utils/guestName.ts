export function normalizeGuestName(name?: string | null): string | undefined {
  if (typeof name !== "string") {
    return undefined
  }

  const normalizedName = name.trim()
  return normalizedName.length > 0 ? normalizedName : undefined
}

export function hasGuestName(name?: string | null): boolean {
  return normalizeGuestName(name) != null
}
