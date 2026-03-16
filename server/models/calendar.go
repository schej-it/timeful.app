package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CalendarType is an enum representing the type of calendar
type CalendarType string

const (
	AppleCalendarType   CalendarType = "apple"
	GoogleCalendarType  CalendarType = "google"
	OutlookCalendarType CalendarType = "outlook"
	ICSCalendarType     CalendarType = "ics"
)

// OAuth2CalendarAuth contains necessary auth info for the user's google calendar account
type OAuth2CalendarAuth struct {
	AccessToken           string             `json:"-" bson:"accessToken,omitempty"`
	AccessTokenExpireDate primitive.DateTime `json:"-" bson:"accessTokenExpireDate,omitempty"`
	RefreshToken          string             `json:"-" bson:"refreshToken,omitempty"`
	Scope                 string             `json:"-" bson:"scope,omitempty"`
}

// AppleCalendarAuth contains necessary auth info for the user's apple calendar account
type AppleCalendarAuth struct {
	Email    string `json:"-" bson:"email,omitempty"`
	Password string `json:"-" bson:"password,omitempty"`
}

type ICSCalendarAuth struct {
	FeedURL string `json:"-" bson:"feedUrl,omitempty"`
	Label   string `json:"label" bson:"label,omitempty"`
}

// CalendarAccount contains info about the user's other signed in calendar accounts
type CalendarAccount struct {
	CalendarType       CalendarType        `json:"calendarType" bson:"calendarType,omitempty"`
	OAuth2CalendarAuth *OAuth2CalendarAuth `json:"oAuth2CalendarAuth" bson:"oAuth2CalendarAuth,omitempty"`
	AppleCalendarAuth  *AppleCalendarAuth  `json:"appleCalendarAuth" bson:"appleCalendarAuth,omitempty"`
	ICSCalendarAuth    *ICSCalendarAuth    `json:"icsCalendarAuth" bson:"icsCalendarAuth,omitempty"`

	Email        string                  `json:"email" bson:"email"` // Email is required for all calendar accounts
	Picture      string                  `json:"picture" bson:"picture,omitempty"`
	Enabled      *bool                   `json:"enabled" bson:"enabled,omitempty"`
	SubCalendars *map[string]SubCalendar `json:"subCalendars" bson:"subCalendars,omitempty"`
}

// SubCalendar represents a calendar within a calendar account
type SubCalendar struct {
	Name    string `json:"name" bson:"name,omitempty"`
	Enabled *bool  `json:"enabled" bson:"enabled,omitempty"`
}

// CalendarOptions contains options for calendar autofill
type CalendarOptions struct {
	BufferTime   BufferTimeOptions   `json:"bufferTime" bson:"bufferTime"`
	WorkingHours WorkingHoursOptions `json:"workingHours" bson:"workingHours"`
}
type BufferTimeOptions struct {
	Enabled bool `json:"enabled" bson:"enabled"`
	Time    int  `json:"time" bson:"time"`
}
type WorkingHoursOptions struct {
	Enabled   bool    `json:"enabled" bson:"enabled"`
	StartTime float32 `json:"startTime" bson:"startTime"`
	EndTime   float32 `json:"endTime" bson:"endTime"`
}

// Simplified representation of a Calendar event from the calendar api
type CalendarEvent struct {
	Id         string             `json:"id" bson:"id,omitempty"`
	CalendarId string             `json:"calendarId" bson:"calendarId,omitempty"`
	Summary    string             `json:"summary" bson:"summary,omitempty"`
	StartDate  primitive.DateTime `json:"startDate" bson:"startDate,omitempty"`
	EndDate    primitive.DateTime `json:"endDate" bson:"endDate,omitempty"`

	// Whether the user is free during this event
	Free bool `json:"free" bson:"free,omitempty"`

	// Whether the event is an all day event
	AllDay bool `json:"allDay" bson:"allDay,omitempty"`
}
