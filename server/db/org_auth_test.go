package db

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
)

// These tests cover the personal-event branches of the auth helpers, which do not touch
// the database. Org-event branches are exercised via integration testing since they
// require a Mongo connection (db.IsOrgMember).

func TestCanEditEvent_PersonalEvents(t *testing.T) {
	owner := &models.User{Id: primitive.NewObjectID()}
	other := &models.User{Id: primitive.NewObjectID()}

	ownedEvent := &models.Event{OwnerId: owner.Id}
	if !CanEditEvent(owner, ownedEvent) {
		t.Error("owner should be able to edit their own event")
	}
	if CanEditEvent(other, ownedEvent) {
		t.Error("non-owner should not be able to edit someone else's event")
	}

	// Guest-owned event (nil owner) is editable by anyone
	guestEvent := &models.Event{OwnerId: primitive.NilObjectID}
	if !CanEditEvent(other, guestEvent) {
		t.Error("guest-owned event should be editable by anyone")
	}
}

func TestCanViewAllResponses_PersonalEvents(t *testing.T) {
	ownerId := primitive.NewObjectID()
	otherId := primitive.NewObjectID()

	event := &models.Event{OwnerId: ownerId}
	if !CanViewAllResponses(ownerId, event) {
		t.Error("owner should be able to view all responses")
	}
	if CanViewAllResponses(otherId, event) {
		t.Error("non-owner should not be able to view all responses")
	}

	// Guest-owned event: nobody is the owner, so nil owner can't view all
	guestEvent := &models.Event{OwnerId: primitive.NilObjectID}
	if CanViewAllResponses(primitive.NilObjectID, guestEvent) {
		t.Error("nil owner should not view all responses on guest event")
	}
}
