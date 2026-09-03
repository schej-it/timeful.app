import { calendarTypes } from "@/constants"
import store from "@/store"

/** Redirects user to the correct google sign in page */
export const signInGoogle = ({
  state = {},
  selectAccount = false,
  requestCalendarPermission = false,
  requestContactsPermission = false,
  loginHint = "",
}) => {
  const clientId = process.env.VUE_APP_GOOGLE_CLIENT_ID
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

  let stateString = ""
  if (!state) state = {}
  state.calendarType = calendarTypes.GOOGLE
  state = encodeURIComponent(JSON.stringify(state))
  stateString = `&state=${state}`

  let promptString = ""
  if (selectAccount) {
    promptString = "&prompt=select_account+consent"
  } else {
    promptString = "&prompt=consent"
    if (loginHint.length > 0) {
      promptString += `&login_hint=${loginHint}`
    } else if (store.state.authUser) {
      promptString += `&login_hint=${store.state.authUser.email}`
    }
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline${promptString}${stateString}&include_granted_scopes=true`
  window.location.href = url
}

export const signInOutlook = ({
  state = {},
  requestCalendarPermission = false,
}) => {
  const clientId = process.env.VUE_APP_MICROSOFT_CLIENT_ID
  const tenant = "common"
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`)

  let scope = "offline_access User.Read"
  if (requestCalendarPermission) {
    scope += " Calendars.Read"
  }
  scope = encodeURIComponent(scope)

  let stateString = ""
  if (!state) state = {}
  state.calendarType = calendarTypes.OUTLOOK
  state.scope = scope
  state = encodeURIComponent(JSON.stringify(state))
  stateString = `&state=${state}`

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}${stateString}`
  window.location.href = url
}

/**
 * Redirects the user to the configured OIDC provider's authorization
 * endpoint to sign in / create an account. This is authentication-only.
 *
 * Requires VUE_APP_OIDC_CLIENT_ID and VUE_APP_OIDC_AUTHORIZATION_ENDPOINT to
 * be set at frontend build time.
 */
export const signInOidc = ({ state = {} } = {}) => {
  const clientId = process.env.VUE_APP_OIDC_CLIENT_ID
  const authorizationEndpoint = process.env.VUE_APP_OIDC_AUTHORIZATION_ENDPOINT
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`)

  // We put scope on `state` because not every OIDC provider echoes `scope`
  // back on the callback. Auth.vue reads `scope ?? state.scope`.
  const scope = "openid email profile"

  if (!state) state = {}
  state.calendarType = calendarTypes.OIDC
  state.scope = scope
  const stateString = `&state=${encodeURIComponent(JSON.stringify(state))}`

  const url = `${authorizationEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(
    scope,
  )}${stateString}`
  window.location.href = url
}
