package db

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
)

// CanEditEvent returns whether the given user may edit/delete/archive/duplicate the event.
// Org events are editable by any org member; personal events follow the existing rules
// (guest-owned events with a nil owner are editable by anyone, otherwise owner-only).
func CanEditEvent(user *models.User, event *models.Event) bool {
	if event.OrganizationId != nil {
		if user == nil {
			return false
		}
		return IsOrgMember(user.Id, *event.OrganizationId)
	}
	if event.OwnerId == primitive.NilObjectID {
		return true
	}
	return user != nil && event.OwnerId == user.Id
}

// CanViewAllResponses controls blind-availability gating: true => the user may see every
// response. Org members can see all responses on org events; otherwise only the owner can.
func CanViewAllResponses(userId primitive.ObjectID, event *models.Event) bool {
	if event.OrganizationId != nil {
		if userId == primitive.NilObjectID {
			return false
		}
		return IsOrgMember(userId, *event.OrganizationId)
	}
	return event.OwnerId != primitive.NilObjectID && event.OwnerId == userId
}
