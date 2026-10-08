//go:build migration

package main

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/models"
)

func main() {
	closeConnection := db.Init()
	defer closeConnection()

	cursor, err := db.UsersCollection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}

	var users []OldUser
	if err := cursor.All(context.Background(), &users); err != nil {
		log.Fatal(err)
	}

	for _, user := range users {
		if user.CalendarAccounts == nil {
			user.CalendarAccounts = make(map[string]models.CalendarAccount)
		}
		if _, ok := user.CalendarAccounts[user.Email]; !ok {
			user.CalendarAccounts[user.Email] = models.CalendarAccount{
				Email:   user.Email,
				Picture: user.Picture,
				Enabled: &[]bool{true}[0], // Workaround to pass a boolean pointer

				AccessToken:           user.AccessToken,
				AccessTokenExpireDate: user.AccessTokenExpireDate,
				RefreshToken:          user.RefreshToken,
			}
			_, err := db.UsersCollection.UpdateByID(context.Background(), user.Id, bson.M{
				"$set": bson.M{
					"calendarAccounts": user.CalendarAccounts,
				},
				"$unset": bson.M{
					"accessToken":           "",
					"accessTokenExpireDate": "",
					"refreshToken":          "",
				},
			})
			if err != nil {
				log.Fatal(err)
			}
		}
	}
}

type OldUser struct {
	TimezoneOffset int `json:"timezoneOffset" bson:"timezoneOffset"`

	// Profile info
	Id        primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	Email     string             `json:"email" bson:"email,omitempty"`
	FirstName string             `json:"firstName" bson:"firstName,omitempty"`
	LastName  string             `json:"lastName" bson:"lastName,omitempty"`
	Picture   string             `json:"picture" bson:"picture,omitempty"`

	// CalendarAccounts is a mapping from {email => CalendarAccount} that contains all the
	// additional accounts the user wants to see google calendar events for
	CalendarAccounts map[string]models.CalendarAccount `json:"calendarAccounts" bson:"calendarAccounts,omitempty"`

	// Google OAuth stuff
	TokenOrigin           models.TokenOriginType `json:"-" bson:"tokenOrigin,omitempty"`
	AccessToken           string                 `json:"-" bson:"accessToken,omitempty"`
	AccessTokenExpireDate primitive.DateTime     `json:"-" bson:"accessTokenExpireDate,omitempty"`
	RefreshToken          string                 `json:"-" bson:"refreshToken,omitempty"`
}
