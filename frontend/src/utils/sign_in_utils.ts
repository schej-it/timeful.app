import { calendarTypes } from "@/constants"
import { useMainStore } from "@/stores/main"

interface SignInGoogleOptions {
  state?: Record<string, unknown> | null
  selectAccount?: boolean
  requestCalendarPermission?: boolean
  requestContactsPermission?: boolean
  loginHint?: string
}

interface SignInOutlookOptions {
  state?: Record<string, unknown> | null
  selectAccount?: boolean
  requestCalendarPermission?: boolean
}

/** Redirects user to the correct google sign in page */
export const signInGoogle = ({
  state = {},
  selectAccount = false,
  requestCalendarPermission = false,
  requestContactsPermission = false,
  loginHint = "",
}: SignInGoogleOptions): void => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth`

  let scope = "openid email profile "
  if (requestCalendarPermission) {
    scope +=
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly "
  }
  if (requestContactsPermission) {
    scope +=
      "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/directory.readonly "
  }
  scope = encodeURIComponent(scope)

  const stateObj = state ?? {}
  stateObj.calendarType = calendarTypes.GOOGLE
  const stateEncoded = encodeURIComponent(JSON.stringify(stateObj))
  const stateString = `&state=${stateEncoded}`

  let promptString = "&prompt=consent"
  if (selectAccount) {
    promptString = "&prompt=select_account+consent"
  } else {
    if (loginHint && loginHint.length > 0) {
      promptString += `&login_hint=${loginHint}`
    } else {
      const authUserEmail = useMainStore().authUser?.email
      if (authUserEmail) {
        promptString += `&login_hint=${authUserEmail}`
      }
    }
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline${promptString}${stateString}&include_granted_scopes=true`
  window.location.href = url
}

export const signInOutlook = ({
  state = {},
  requestCalendarPermission = false,
}: SignInOutlookOptions): void => {
  const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`)

  let scope = "offline_access User.Read"
  if (requestCalendarPermission) {
    scope += " Calendars.Read"
  }
  scope = encodeURIComponent(scope)

  const stateObj = state ?? {}
  stateObj.calendarType = calendarTypes.OUTLOOK
  stateObj.scope = scope
  const stateEncoded = encodeURIComponent(JSON.stringify(stateObj))
  const stateString = `&state=${stateEncoded}`

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}${stateString}`
  window.location.href = url
}