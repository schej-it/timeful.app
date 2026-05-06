import { get, post } from "@/utils"
import type { User } from "@/types"
import type { RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

export async function fetchAuthUserProfile(): Promise<User> {
  return fromRawUser(await get<RawUser>("/user/profile"))
}

export async function fetchUserById(userId: string): Promise<User> {
  return fromRawUser(await get<RawUser>(`/users/${userId}`))
}

export async function signInWithOAuthCode(payload: {
  code: unknown
  scope: unknown
  calendarType?: string
  timezoneOffset: number
  eventsToLink: string[]
}): Promise<User> {
  return fromRawUser(await post<RawUser>("/auth/sign-in", payload))
}

export async function verifyOtpSignIn(
  payload: Record<string, unknown>
): Promise<User> {
  return fromRawUser(await post<RawUser>("/auth/otp/verify", payload))
}
