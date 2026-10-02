package main

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"schej.it/server/db"
	"schej.it/server/models"
	"schej.it/server/utils"
)

/*
Seeds a demo user and event into the DB for local development.

Usage:

	MONGODB_URI=mongodb://localhost:27017 go run main.go
*/
func main() {
	ctx := context.Background()
	closeConn := db.Init()
	defer closeConn()

	// Create/find demo user
	email := "demo@timeful.local"
	var user models.User
	err := db.UsersCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		accountKey := utils.GetCalendarAccountKey(email, models.GoogleCalendarType)
		user = models.User{
			Id:             primitive.NewObjectID(),
			TimezoneOffset: 0,
			Email:          email,
			FirstName:      "Demo",
			LastName:       "User",
			CalendarAccounts: map[string]models.CalendarAccount{
				accountKey: {
					CalendarType: models.GoogleCalendarType,
					Email:        email,
					Enabled:      utils.TruePtr(),
				},
			},
			PrimaryAccountKey: &accountKey,
			IsPremium:         utils.FalsePtr(),
			NumEventsCreated:  0,
		}
		if _, err := db.UsersCollection.InsertOne(ctx, user); err != nil {
			panic(err)
		}
		fmt.Println("Inserted demo user:", email)
	} else if err != nil {
		panic(err)
	} else {
		fmt.Println("Demo user already exists:", email)
	}

	ownerId := user.Id

	// Create/find demo event
	eventName := "Demo Availability"
	existing := db.EventsCollection.FindOne(ctx, bson.M{"ownerId": ownerId, "name": eventName})
	if existing.Err() == nil {
		fmt.Println("Demo event already exists:", eventName)
		return
	}

	// Build sample event with a few specific dates
	now := time.Now().UTC()
	dates := []primitive.DateTime{
		primitive.NewDateTimeFromTime(now.AddDate(0, 0, 1)),
		primitive.NewDateTimeFromTime(now.AddDate(0, 0, 2)),
		primitive.NewDateTimeFromTime(now.AddDate(0, 0, 3)),
	}

	duration := float32(60)
	timeIncrement := 30
	numResponses := 0

	description := "Sample event seeded for local testing"
	sendEmailAfter := 0

	event := models.Event{
		Id:                       primitive.NewObjectID(),
		OwnerId:                  ownerId,
		Name:                     eventName,
		Description:              &description,
		IsArchived:               utils.FalsePtr(),
		IsDeleted:                utils.FalsePtr(),
		Duration:                 &duration,
		Dates:                    dates,
		NotificationsEnabled:     utils.FalsePtr(),
		SendEmailAfterXResponses: &sendEmailAfter,
		When2meetHref:            nil,
		CollectEmails:            utils.FalsePtr(),
		TimeIncrement:            &timeIncrement,
		HasSpecificTimes:         utils.FalsePtr(),
		Times:                    []primitive.DateTime{},
		Type:                     models.SPECIFIC_DATES,
		CreatorPosthogId:         nil,
		IsSignUpForm:             utils.FalsePtr(),
		SignUpBlocks:             &[]models.SignUpBlock{},
		SignUpResponses:          map[string]*models.SignUpResponse{},
		StartOnMonday:            utils.FalsePtr(),
		BlindAvailabilityEnabled: utils.FalsePtr(),
		DaysOnly:                 utils.FalsePtr(),
		ResponsesMap:             map[string]*models.Response{},
		NumResponses:             &numResponses,
	}

	shortId := db.GenerateShortEventId(event.Id)
	event.ShortId = &shortId

	if _, err := db.EventsCollection.InsertOne(ctx, event); err != nil {
		panic(err)
	}

	fmt.Printf("Inserted demo event: %s (id: %s, shortId: %s)\n", event.Name, event.Id.Hex(), shortId)
}
