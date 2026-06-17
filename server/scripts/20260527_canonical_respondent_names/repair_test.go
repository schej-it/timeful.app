package main

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
)

func TestRepairCanonicalEventResponseGroupKeepsNewestCanonicalGuestDuplicate(t *testing.T) {
	eventID := primitive.NewObjectID()
	olderID := primitive.NewObjectIDFromTimestamp(time.Date(2026, 5, 27, 9, 0, 0, 0, time.UTC))
	newerID := primitive.NewObjectIDFromTimestamp(time.Date(2026, 5, 27, 10, 0, 0, 0, time.UTC))

	updates, deletions, collisionsResolved := repairCanonicalEventResponseGroup(
		[]models.EventResponse{
			{
				Id:      olderID,
				EventId: eventID,
				UserId:  "older-row",
				Response: &models.Response{
					Name: "  A\u200bda\u0301  ",
				},
			},
			{
				Id:      newerID,
				EventId: eventID,
				UserId:  "newer-row",
				Response: &models.Response{
					Name: "Adá",
				},
			},
		},
		func(string) *models.User { return nil },
	)

	if collisionsResolved != 1 {
		t.Fatalf("expected one resolved collision, got %d", collisionsResolved)
	}
	if len(updates) != 1 || updates[0].Id != newerID || updates[0].UserId != "Adá" {
		t.Fatalf("expected newest row to be updated and retained, got %#v", updates)
	}
	if len(deletions) != 1 || deletions[0].Id != olderID {
		t.Fatalf("expected older row to be deleted, got %#v", deletions)
	}
}

func TestRepairSignUpResponseMapKeepsDeterministicCanonicalWinner(t *testing.T) {
	older := &models.SignUpResponse{Name: "Adá"}
	newer := &models.SignUpResponse{Name: "  A\u200bda\u0301  "}

	result := repairSignUpResponseMap(
		map[string]*models.SignUpResponse{
			"zeta-row":  older,
			"alpha-row": newer,
		},
		func(string) *models.User { return nil },
	)

	if !result.updated {
		t.Fatal("expected canonical guest collision to trigger an update")
	}
	if result.deletedRows != 1 || result.collisionResolved != 1 {
		t.Fatalf("expected one deleted collision row, got deleted=%d collisions=%d", result.deletedRows, result.collisionResolved)
	}
	winner, exists := result.rewritten["Adá"]
	if !exists {
		t.Fatalf("expected canonical sign-up key to be retained, got %#v", result.rewritten)
	}
	if winner.Name != "Adá" {
		t.Fatalf("expected canonical winner payload, got %#v", winner)
	}
	if len(result.rewritten) != 1 {
		t.Fatalf("expected a single canonical sign-up winner, got %d rows", len(result.rewritten))
	}
}

func TestRepairSignUpResponseMapIsIdempotent(t *testing.T) {
	firstPass := repairSignUpResponseMap(
		map[string]*models.SignUpResponse{
			"repairable": {Name: "  A\u200bda\u0301  "},
			"invalid":    {Name: "   "},
		},
		func(string) *models.User { return nil },
	)

	secondPass := repairSignUpResponseMap(firstPass.rewritten, func(string) *models.User { return nil })

	if !firstPass.updated {
		t.Fatal("expected first pass to rewrite canonical guest names")
	}
	if secondPass.updated {
		t.Fatalf("expected second pass to be idempotent, got %#v", secondPass)
	}
	if len(secondPass.rewritten) != 1 {
		t.Fatalf("expected one canonical sign-up row after idempotent rerun, got %d", len(secondPass.rewritten))
	}
	if _, exists := secondPass.rewritten["Adá"]; !exists {
		t.Fatalf("expected canonical guest key after rerun, got %#v", secondPass.rewritten)
	}
}
