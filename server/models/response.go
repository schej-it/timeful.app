package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type EventResponse struct {
	Id      primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	EventId primitive.ObjectID `json:"eventId" bson:"eventId"`

	UserId   string    `json:"userId" bson:"userId"`
	Response *Response `json:"response" bson:"response"`
}

// A response object containing an array of times that the given user is available
type Response struct {
	// Guest information
	Name               string `json:"name" bson:"name,omitempty"`
	Email              string `json:"email" bson:"email,omitempty"`
	GuestId            string `json:"guestId,omitempty" bson:"guestId,omitempty"`
	GuestEditToken     string `json:"-" bson:"guestEditToken,omitempty"`
	GuestEditPolicy    string `json:"guestEditPolicy,omitempty" bson:"guestEditPolicy,omitempty"`
	GuestOwnershipMode string `json:"guestOwnershipMode,omitempty" bson:"guestOwnershipMode,omitempty"`

	// User information
	UserId primitive.ObjectID `json:"userId" bson:"userId,omitempty"`
	User   *User              `json:"user" bson:",omitempty"`

	// Availability
	Availability []primitive.DateTime `json:"availability" bson:"availability"`
	IfNeeded     []primitive.DateTime `json:"ifNeeded" bson:"ifNeeded"`

	// Mapping from the start date of a day to the available times for that day
	ManualAvailability *map[primitive.DateTime][]primitive.DateTime `json:"manualAvailability" bson:"manualAvailability,omitempty"`

	// Calendar availability variables for Availability Groups feature
	UseCalendarAvailability *bool                `json:"useCalendarAvailability" bson:"useCalendarAvailability,omitempty"`
	EnabledCalendars        *map[string][]string `json:"enabledCalendars" bson:"enabledCalendars,omitempty"` // Maps email to an array of sub calendar ids
	CalendarOptions         *CalendarOptions     `json:"calendarOptions" bson:"calendarOptions,omitempty"`
}
