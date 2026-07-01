package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// OrgRole is the role a user has within an organization
type OrgRole string

const (
	OrgRoleOwner  OrgRole = "owner"
	OrgRoleAdmin  OrgRole = "admin"
	OrgRoleMember OrgRole = "member"
)

// RoleRank returns a numeric rank used to compare roles. Higher = more privileged.
func (r OrgRole) RoleRank() int {
	switch r {
	case OrgRoleOwner:
		return 3
	case OrgRoleAdmin:
		return 2
	case OrgRoleMember:
		return 1
	default:
		return 0
	}
}

// OrgSubStatus is the state of an organization's per-seat Stripe subscription
type OrgSubStatus string

const (
	OrgSubNone     OrgSubStatus = "" // never subscribed yet
	OrgSubActive   OrgSubStatus = "active"
	OrgSubPastDue  OrgSubStatus = "past_due"
	OrgSubCanceled OrgSubStatus = "canceled"
)

// Organization is a team/workspace that can collaboratively own events. Its Stripe
// state lives here (separate customer + subscription) so org premium and personal
// premium stay fully decoupled.
type Organization struct {
	Id        primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name,omitempty"`
	OwnerId   primitive.ObjectID `json:"ownerId" bson:"ownerId,omitempty"`
	CreatedAt primitive.DateTime `json:"createdAt" bson:"createdAt,omitempty"`
	IsDeleted *bool              `json:"isDeleted" bson:"isDeleted,omitempty"`

	// Stripe (org-scoped per-seat subscription)
	StripeCustomerId         *string      `json:"stripeCustomerId" bson:"stripeCustomerId,omitempty"`
	StripeSubscriptionId     *string      `json:"-" bson:"stripeSubscriptionId,omitempty"`
	StripeSubscriptionItemId *string      `json:"-" bson:"stripeSubscriptionItemId,omitempty"` // needed to PATCH quantity
	SeatCount                int          `json:"seatCount" bson:"seatCount,omitempty"`
	SubscriptionStatus       OrgSubStatus `json:"subscriptionStatus" bson:"subscriptionStatus,omitempty"`

	// Populated (not persisted) for API responses
	MyRole      OrgRole              `json:"myRole" bson:"-"`
	Members     []OrganizationMember `json:"members" bson:"-"`
	MemberCount int                  `json:"memberCount" bson:"-"`
}

// OrganizationMember is a membership record linking a user to an organization with a role.
// Stored in its own collection so event-authorization membership lookups are O(1).
type OrganizationMember struct {
	Id             primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	OrganizationId primitive.ObjectID `json:"organizationId" bson:"organizationId,omitempty"`
	UserId         primitive.ObjectID `json:"userId" bson:"userId,omitempty"`
	Role           OrgRole            `json:"role" bson:"role,omitempty"`
	CreatedAt      primitive.DateTime `json:"createdAt" bson:"createdAt,omitempty"`

	User *User `json:"user" bson:"-"` // populated for member list
}

// OrganizationInvitation is a pending invite to join an org, keyed by email so it works
// for users who don't have a Timeful account yet. Mirrors the FriendRequest pattern.
type OrganizationInvitation struct {
	Id             primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	OrganizationId primitive.ObjectID `json:"organizationId" bson:"organizationId,omitempty"`
	Email          string             `json:"email" bson:"email,omitempty"` // stored lowercased
	Role           OrgRole            `json:"role" bson:"role,omitempty"`   // member or admin
	InvitedBy      primitive.ObjectID `json:"invitedBy" bson:"invitedBy,omitempty"`
	Token          string             `json:"-" bson:"token,omitempty"` // random; used in accept link
	CreatedAt      primitive.DateTime `json:"createdAt" bson:"createdAt,omitempty"`

	Organization *Organization `json:"organization" bson:"-"` // populated for invitee listing
}
