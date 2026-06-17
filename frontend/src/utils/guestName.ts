const GUEST_NAME_MAX_LENGTH = 100
const DISALLOWED_NAME_CHARACTERS_PATTERN = /[\p{Cc}\p{Cf}]/gu
const OBJECT_ID_LIKE_PATTERN = /^[a-f\d]{24}$/iu
export type GuestNameValidationCode =
  | "required"
  | "invalidFormatting"
  | "objectIdLike"
  | "tooLong"

export interface GuestNameValidationResult {
  code?: GuestNameValidationCode
  normalizedName?: string
}

function getCodePointLength(value: string): number {
  let count = 0
  for (const _char of value) {
    count += 1
  }
  return count
}

function stripDisallowedNameCharacters(name: string): string {
  return name.replace(DISALLOWED_NAME_CHARACTERS_PATTERN, "")
}

export function normalizeGuestName(name?: string | null): string | undefined {
  if (typeof name !== "string") {
    return undefined
  }

  const normalizedName = stripDisallowedNameCharacters(name)
    .normalize("NFC")
    .trim()
  return normalizedName.length > 0 ? normalizedName : undefined
}

export function validateGuestName(
  name?: string | null
): GuestNameValidationResult {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { code: "required" }
  }

  const normalizedName = normalizeGuestName(name)
  if (!normalizedName) {
    return { code: "invalidFormatting" }
  }

  if (getCodePointLength(normalizedName) > GUEST_NAME_MAX_LENGTH) {
    return { code: "tooLong" }
  }

  if (OBJECT_ID_LIKE_PATTERN.test(normalizedName)) {
    return { code: "objectIdLike" }
  }

  return { normalizedName }
}

export function hasGuestName(name?: string | null): boolean {
  return validateGuestName(name).normalizedName != null
}

export function getGuestNameValidationMessage(
  code?: GuestNameValidationCode
): string | undefined {
  switch (code) {
    case "required":
      return "Name is required"
    case "invalidFormatting":
      return "Name contains only unsupported formatting characters"
    case "objectIdLike":
      return "Name cannot look like an account ID"
    case "tooLong":
      return "Name must be 100 characters or fewer"
    default:
      return undefined
  }
}

export function getResponseDisplayName(input?: {
  name?: string | null
  user?: {
    firstName?: string | null
    lastName?: string | null
  } | null
}): string {
  const userDisplayName = [input?.user?.firstName, input?.user?.lastName]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .trim()

  if (userDisplayName.length > 0) {
    return userDisplayName
  }

  return input?.name ?? ""
}
