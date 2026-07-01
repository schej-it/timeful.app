import { get, post, patch, _delete } from "../fetch_utils"

const ORG_API_ROUTE = "/organizations"
const ORG_INVITE_API_ROUTE = "/org-invitations"

// --- Organizations ---

export const createOrg = (name) => {
  return post(ORG_API_ROUTE, { name })
}

export const listOrgs = () => {
  return get(ORG_API_ROUTE)
}

export const getOrg = (orgId) => {
  return get(`${ORG_API_ROUTE}/${orgId}`)
}

export const updateOrg = (orgId, name) => {
  return patch(`${ORG_API_ROUTE}/${orgId}`, { name })
}

export const deleteOrg = (orgId) => {
  return _delete(`${ORG_API_ROUTE}/${orgId}`)
}

// --- Members ---

export const listMembers = (orgId) => {
  return get(`${ORG_API_ROUTE}/${orgId}/members`)
}

export const removeMember = (orgId, userId) => {
  return _delete(`${ORG_API_ROUTE}/${orgId}/members/${userId}`)
}

export const changeMemberRole = (orgId, userId, role) => {
  return patch(`${ORG_API_ROUTE}/${orgId}/members/${userId}`, { role })
}

export const leaveOrg = (orgId) => {
  return post(`${ORG_API_ROUTE}/${orgId}/leave`)
}

// --- Invitations (org-side) ---

export const listInvitations = (orgId) => {
  return get(`${ORG_API_ROUTE}/${orgId}/invitations`)
}

export const inviteMember = (orgId, email, role = "member") => {
  return post(`${ORG_API_ROUTE}/${orgId}/invitations`, { email, role })
}

export const revokeInvitation = (orgId, invitationId) => {
  return _delete(`${ORG_API_ROUTE}/${orgId}/invitations/${invitationId}`)
}

// --- Invitations (invitee-side) ---

export const listMyInvitations = () => {
  return get(ORG_INVITE_API_ROUTE)
}

export const acceptInvitation = (invitationId) => {
  return post(`${ORG_INVITE_API_ROUTE}/${invitationId}/accept`)
}

export const declineInvitation = (invitationId) => {
  return post(`${ORG_INVITE_API_ROUTE}/${invitationId}/decline`)
}

// --- Billing ---

export const createTeamCheckout = (orgId, originUrl) => {
  return post(`${ORG_API_ROUTE}/${orgId}/checkout-session`, { originUrl })
}

export const getOrgBillingPortal = (orgId, returnUrl) => {
  const query = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""
  return get(`${ORG_API_ROUTE}/${orgId}/billing-portal${query}`)
}
