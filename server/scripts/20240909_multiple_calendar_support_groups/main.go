//go:build migration

package main

import (
	"context"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"schej.it/server/db"
	"schej.it/server/models"
)

func main() {
	// Initialize the database connection
	closeConnection := db.Init()
	defer closeConnection()

	// Find all events of EventType GROUP
	filter := bson.M{
		"type": models.GROUP,
	}
	cursor, err := db.EventsCollection.Find(context.Background(), filter)
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.Background())

	for cursor.Next(context.Background()) {
		var event models.Event
		if err := cursor.Decode(&event); err != nil {
			log.Printf("Error decoding event: %v", err)
			continue
		}

		updated := false // Track whether we made any updates

		// Iterate through the responses to check and update calendar keys
		for _, response := range event.Responses {
			if response.EnabledCalendars != nil {
				newEnabledCalendars := make(map[string][]string) // Create a new map for updated keys

				// Iterate through the existing enabled calendars
				for calendarEmail, calendarIds := range *response.EnabledCalendars {
					// Check if the calendar key doesn't end with '_google' or '_apple'
					if !strings.HasSuffix(calendarEmail, "_google") && !strings.HasSuffix(calendarEmail, "_apple") {
						// Append '_google' to the key
						newCalendarEmail := calendarEmail + "_google"
						newEnabledCalendars[newCalendarEmail] = calendarIds

						log.Printf("Updated calendar key for event %s (response by %s): %s -> %s", event.GetId(), response.Email, calendarEmail, newCalendarEmail)
						updated = true
					} else {
						// If no changes are needed, keep the original key-value pair
						newEnabledCalendars[calendarEmail] = calendarIds
					}
				}

				// Replace the old map with the new one
				response.EnabledCalendars = &newEnabledCalendars
			}
		}

		// If updates were made, update the event in MongoDB
		if updated {
			update := bson.M{
				"$set": bson.M{
					"responses": event.Responses,
				},
			}

			_, err := db.EventsCollection.UpdateByID(context.Background(), event.Id, update)
			if err != nil {
				log.Printf("Error updating event %s: %v", event.GetId(), err)
			} else {
				log.Printf("Successfully updated event: %s", event.GetId())
			}
		}
	}

	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}

	log.Println("Migration completed successfully")
}
