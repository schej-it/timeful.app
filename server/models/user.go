package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Representation of a User in the mongoDB database
type User struct {
	TimezoneOffset int `json:"timezoneOffset" bson:"timezoneOffset"`

	// Profile info
	Id        primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	Email     string             `json:"email" bson:"email,omitempty"`
	FirstName string             `json:"firstName" bson:"firstName,omitempty"`
	LastName  string             `json:"lastName" bson:"lastName,omitempty"`
	Picture   string             `json:"picture" bson:"picture,omitempty"`

	// Whether the user has set a custom name for themselves, i.e. don't change their name when they sign in
	HasCustomName *bool `json:"hasCustomName" bson:"hasCustomName,omitempty"`

	// CalendarAccounts is a mapping from {`email_CALENDARTYPE` => CalendarAccount} that contains all the
	// additional accounts the user wants to see google calendar events for
	CalendarAccounts map[string]CalendarAccount `json:"calendarAccounts" bson:"calendarAccounts,omitempty"`

	// The calendarAccountKey of the account the user first signed in with
	PrimaryAccountKey *string `json:"primaryAccountKey" bson:"primaryAccountKey,omitempty"`

	// Google OAuth stuff
	TokenOrigin TokenOriginType `json:"-" bson:"tokenOrigin,omitempty"`

	// Calendar options
	CalendarOptions *CalendarOptions `json:"calendarOptions" bson:"calendarOptions,omitempty"`

	NumEventsCreated int `json:"numEventsCreated" bson:"numEventsCreated,omitempty"`
}

// Declare the possible types of TokenOrigin
type TokenOriginType string

const (
	Undefined TokenOriginType = ""
	IOS       TokenOriginType = "ios"
	ANDROID   TokenOriginType = "android"
	WEB       TokenOriginType = "web"
)

type UserStatus string

const (
	FREE UserStatus = "free"
	BUSY UserStatus = "busy"
)
