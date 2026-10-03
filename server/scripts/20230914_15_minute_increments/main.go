//go:build migration

package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/models"
)

func main() {
	closeConnection := db.Init()
	defer closeConnection()

	cursor, err := db.EventsCollection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}

	var events []OldEvent
	var newEvents []models.Event
	if err := cursor.All(context.Background(), &events); err != nil {
		log.Fatal(err)
	}

	for i, event := range events {
		newEvents = append(newEvents, models.Event{
			Id:      event.Id,
			OwnerId: event.OwnerId,
			Name:    event.Name,

			Duration:             event.Duration,
			Dates:                event.Dates,
			NotificationsEnabled: event.NotificationsEnabled,

			Type: event.Type,

			Responses: make(map[string]*models.Response),

			ScheduledEvent:  event.ScheduledEvent,
			CalendarEventId: event.CalendarEventId,
		})

		for user, response := range event.Responses {
			newAvailability := make([]primitive.DateTime, 0)
			for _, dateString := range response.Availability {
				parsedTime, err := time.Parse(time.RFC3339, dateString)
				if err != nil {
					log.Fatal(err)
				}

				availDate := primitive.NewDateTimeFromTime(parsedTime)
				availDatePlus15 := primitive.NewDateTimeFromTime(parsedTime.Add(15 * time.Minute))
				newAvailability = append(newAvailability, availDate)
				newAvailability = append(newAvailability, availDatePlus15)
			}

			newEvents[i].Responses[user] = &models.Response{
				Name:         response.Name,
				UserId:       response.UserId,
				User:         response.User,
				Availability: newAvailability,
			}
		}
	}

	for _, newEvent := range newEvents {
		_, err := db.EventsCollection.UpdateByID(context.Background(), newEvent.Id, bson.M{
			"$set": newEvent,
		})
		if err != nil {
			log.Fatal(err)
		}
	}
}

// Representation of an Event in the mongoDB database
type OldEvent struct {
	Id      primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	OwnerId primitive.ObjectID `json:"ownerId" bson:"ownerId,omitempty"`
	Name    string             `json:"name" bson:"name,omitempty"`

	Duration             *float32             `json:"duration" bson:"duration,omitempty"`
	Dates                []primitive.DateTime `json:"dates" bson:"dates,omitempty"`
	NotificationsEnabled *bool                `json:"notificationsEnabled" bson:"notificationsEnabled,omitempty"`

	Type models.EventType `json:"type" bson:"type,omitempty"`

	// Availability responses
	Responses map[string]*OldResponse `json:"responses" bson:"responses"`

	// Scheduled event
	ScheduledEvent  *models.CalendarEvent `json:"scheduledEvent" bson:"scheduledEvent,omitempty"`
	CalendarEventId string                `json:"calendarEventId" bson:"calendarEventId,omitempty"`
}

// A response object containing an array of times that the given user is available
type OldResponse struct {
	Name         string             `json:"name" bson:",omitempty"`
	UserId       primitive.ObjectID `json:"userId" bson:",omitempty"`
	User         *models.User       `json:"user" bson:",omitempty"`
	Availability []string           `json:"availability" bson:"availability"`
}
