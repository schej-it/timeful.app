package db

import (
	"context"
	"crypto/rand"
	"math/big"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"schej.it/server/logger"
	"schej.it/server/models"
)

// Returns an event based on its _id
func GetEventById(eventId string) *models.Event {
	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		return nil
	}
	result := EventsCollection.FindOne(context.Background(), bson.M{
		"$and": bson.A{
			bson.M{"_id": objectId},
			bson.M{
				"$or": bson.A{
					bson.M{"isDeleted": bson.M{"$exists": false}},
					bson.M{"isDeleted": bson.M{"$eq": false}},
				},
			},
		},
	})
	if result.Err() == mongo.ErrNoDocuments {
		// Event does not exist!
		return nil
	}

	// Decode result
	var event models.Event
	if err := result.Decode(&event); err != nil {
		logger.StdErr.Panicln(err)
	}

	return &event
}

// Returns an event based on its shortId
func GetEventByShortId(shortEventId string) *models.Event {
	result := EventsCollection.FindOne(context.Background(), bson.M{
		"$and": bson.A{
			bson.M{"shortId": shortEventId},
			bson.M{
				"$or": bson.A{
					bson.M{"isDeleted": bson.M{"$exists": false}},
					bson.M{"isDeleted": bson.M{"$eq": false}},
				},
			},
		},
	})
	if result.Err() == mongo.ErrNoDocuments {
		// Event does not exist!
		return nil
	}

	// Decode result
	var event models.Event
	if err := result.Decode(&event); err != nil {
		logger.StdErr.Panicln(err)
	}

	return &event
}

// Returns an event by either its _id or shortId
func GetEventByEitherId(id string) *models.Event {
	if len(id) <= 10 {
		return GetEventByShortId(id)
	}

	return GetEventById(id)
}

func GetEventResponses(eventId string) []models.EventResponse {
	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		return []models.EventResponse{}
	}

	result, err := EventResponsesCollection.Find(context.Background(), bson.M{
		"eventId": objectId,
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	if result.Err() == mongo.ErrNoDocuments {
		// Event responses do not exist!
		return []models.EventResponse{}
	}

	var eventResponses []models.EventResponse
	if err := result.All(context.Background(), &eventResponses); err != nil {
		logger.StdErr.Panicln(err)
	}

	return eventResponses
}

func GetAttendees(eventId string) []models.Attendee {
	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		return []models.Attendee{}
	}

	result, err := AttendeesCollection.Find(context.Background(), bson.M{
		"eventId": objectId,
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	if result.Err() == mongo.ErrNoDocuments {
		// Attendees do not exist!
		return []models.Attendee{}
	}

	var attendees []models.Attendee
	if err := result.All(context.Background(), &attendees); err != nil {
		logger.StdErr.Panicln(err)
	}

	return attendees
}

func GetEventsCreatedThisMonth(userId primitive.ObjectID) int {
	// Get the start of this month
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	result, err := EventsCollection.CountDocuments(context.Background(), bson.M{
		"ownerId": userId,
		"_id": bson.M{
			"$gte": primitive.NewObjectIDFromTimestamp(startOfMonth),
		},
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	return int(result)
}

// Returns a cryptographically random short event id that is not already in use
func GenerateShortEventId() string {
	maxAttempts := 10

	for attempt := 0; attempt < maxAttempts; attempt++ {
		id := randomShortId()
		if GetEventByShortId(id) == nil {
			return id
		}
	}

	logger.StdErr.Panicln("Couldn't generate unique id")
	return ""
}

func randomShortId() string {
	letters := "23456789ABCDEFabcdef"
	// Must stay <= 10. GetEventByEitherId treats longer ids as ObjectIDs
	shortIdLen := 10
	alphabetLen := big.NewInt(int64(len(letters)))
	b := make([]byte, shortIdLen)
	for i := range b {
		n, err := rand.Int(rand.Reader, alphabetLen)
		if err != nil {
			logger.StdErr.Panicln(err)
		}
		b[i] = letters[n.Int64()]
	}
	return string(b)
}

// Updates the name of a guest response
func UpdateGuestResponseName(eventId string, oldName string, newName string) {
	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		return
	}

	_, err = EventResponsesCollection.UpdateOne(context.Background(), bson.M{
		"eventId": objectId,
		"userId":  oldName,
	}, bson.M{
		"$set": bson.M{
			"userId":        newName,
			"response.name": newName,
		},
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}
}

// Checks if a guest name already exists for an event
// Returns true if the guest name already exists, false otherwise
// Also returns true if the name matches a logged-in user's ObjectID (to prevent conflicts)
// Only checks for guest users (non-logged-in users), not logged-in users
func GuestNameExists(eventId string, guestName string) bool {
	event := GetEventByEitherId(eventId)
	if event == nil {
		return false
	}

	// Check if the name is a valid ObjectID that corresponds to an existing user
	// If so, block it to prevent conflicts
	//NOTE: we're checking against ALL logged in users because in case we allowed this, and a user with an account tried to
	// submit their availability, overwriting would happen and we'd lose data.
	objectId, err := primitive.ObjectIDFromHex(guestName)
	if err == nil {
		// The name is a valid ObjectID format - check if a user exists with this ID
		user := GetUserById(objectId.Hex())
		if user != nil {
			// A logged-in user exists with this ObjectID, so block it
			return true
		}
	}

	// For events, check EventResponsesCollection
	eventObjectId, err := primitive.ObjectIDFromHex(event.Id.Hex())
	if err != nil {
		return false
	}

	// Check if a response exists with this userId AND it's a guest (userId is not a valid ObjectID)
	result := EventResponsesCollection.FindOne(context.Background(), bson.M{
		"eventId": eventObjectId,
		"userId":  guestName,
	})

	if result.Err() == mongo.ErrNoDocuments {
		// No response found with this userId
		return false
	}

	// Response found - verify it's a guest (userId is not a valid ObjectID)
	_, err = primitive.ObjectIDFromHex(guestName)
	if err != nil {
		// userId cannot be parsed as ObjectID, so it's a guest
		return true
	}

	// userId can be parsed as ObjectID, so it's a logged-in user, not a guest
	return false
}
