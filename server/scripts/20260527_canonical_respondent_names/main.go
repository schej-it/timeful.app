package main

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/db"
	"schej.it/server/models"
)

type migrationStats struct {
	eventResponseUpdated    int
	eventResponseDeleted    int
	eventResponseCollisions int
	signUpEventsUpdated     int
	signUpRowsDeleted       int
	signUpCollisions        int
}

func main() {
	closeDB := db.Init()
	defer closeDB()

	ctx := context.Background()
	stats := &migrationStats{}

	repairEventResponses(ctx, stats)
	repairSignUpResponses(ctx, stats)

	log.Printf(
		"canonical respondent migration complete: eventResponsesUpdated=%d eventResponsesDeleted=%d eventResponseCollisions=%d signUpEventsUpdated=%d signUpRowsDeleted=%d signUpCollisions=%d",
		stats.eventResponseUpdated,
		stats.eventResponseDeleted,
		stats.eventResponseCollisions,
		stats.signUpEventsUpdated,
		stats.signUpRowsDeleted,
		stats.signUpCollisions,
	)
}

func repairEventResponses(ctx context.Context, stats *migrationStats) {
	cursor, err := db.EventResponsesCollection.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{
		{Key: "eventId", Value: 1},
		{Key: "_id", Value: 1},
	}))
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	var (
		currentEventID string
		group          []models.EventResponse
	)

	flushGroup := func() {
		if len(group) == 0 {
			return
		}

		updates, deletions, collisionsResolved := repairCanonicalEventResponseGroup(group, db.GetUserById)
		for _, row := range updates {
			if _, err := db.EventResponsesCollection.UpdateOne(
				ctx,
				bson.M{"_id": row.Id},
				bson.M{"$set": bson.M{
					"userId":   row.UserId,
					"response": row.Response,
				}},
			); err != nil {
				log.Fatal(err)
			}
			stats.eventResponseUpdated++
		}
		for _, row := range deletions {
			if _, err := db.EventResponsesCollection.DeleteOne(ctx, bson.M{"_id": row.Id}); err != nil {
				log.Fatal(err)
			}
			stats.eventResponseDeleted++
		}
		stats.eventResponseCollisions += collisionsResolved
		group = group[:0]
	}

	for cursor.Next(ctx) {
		var eventResponse models.EventResponse
		if err := cursor.Decode(&eventResponse); err != nil {
			log.Fatal(err)
		}
		eventGroupID := eventResponse.EventId.Hex()
		if currentEventID != "" && eventGroupID != currentEventID {
			flushGroup()
		}
		currentEventID = eventGroupID
		group = append(group, eventResponse)
	}

	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}

	flushGroup()
}

func repairSignUpResponses(ctx context.Context, stats *migrationStats) {
	cursor, err := db.EventsCollection.Find(ctx, bson.M{
		"signUpResponses": bson.M{"$exists": true, "$ne": nil},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var event models.Event
		if err := cursor.Decode(&event); err != nil {
			log.Fatal(err)
		}

		if len(event.SignUpResponses) == 0 {
			continue
		}

		result := repairSignUpResponseMap(event.SignUpResponses, db.GetUserById)
		if !result.updated {
			continue
		}

		if _, err := db.EventsCollection.UpdateOne(
			ctx,
			bson.M{"_id": event.Id},
			bson.M{"$set": bson.M{"signUpResponses": result.rewritten}},
		); err != nil {
			log.Fatal(err)
		}

		stats.signUpEventsUpdated++
		stats.signUpRowsDeleted += result.deletedRows
		stats.signUpCollisions += result.collisionResolved
	}

	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}
}
