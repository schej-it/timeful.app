package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EventType string

const (
	SPECIFIC_DATES EventType = "specific_dates"
	DOW            EventType = "dow"
	GROUP          EventType = "group"
)

// Object containing information associated with the remindee
type Remindee struct {
	Email     string   `json:"email" bson:"email,omitempty"`
	TaskIds   []string `json:"-" bson:"taskIds,omitempty"` // Task IDs of the scheduled emails
	Responded *bool    `json:"responded" bson:"responded,omitempty"`
}

type SignUpBlock struct {
	Id        primitive.ObjectID  `json:"_id" bson:"_id,omitempty"`
	Name      string              `json:"name" bson:"name,omitempty"`
	Capacity  *int                `json:"capacity" bson:"capacity,omitempty"`
	StartDate *primitive.DateTime `json:"startDate" bson:"startDate,omitempty"`
	EndDate   *primitive.DateTime `json:"endDate" bson:"endDate,omitempty"`
}

type SignUpResponse struct {
	// The IDs of the sign up blocks that the user has signed up for
	SignUpBlockIds []primitive.ObjectID `json:"signUpBlockIds" bson:"signUpBlockIds,omitempty"`

	// Guest information
	Name  string `json:"name" bson:"name,omitempty"`
	Email string `json:"email" bson:"email,omitempty"`

	// User information
	UserId primitive.ObjectID `json:"userId" bson:"userId,omitempty"`
	User   *User              `json:"user" bson:",omitempty"`
}

type SlotGeneration struct {
	StartTimeLocal       string `json:"startTimeLocal" bson:"startTimeLocal,omitempty"`
	EndTimeLocal         string `json:"endTimeLocal" bson:"endTimeLocal,omitempty"`
	TimeIncrementMinutes int    `json:"timeIncrementMinutes" bson:"timeIncrementMinutes,omitempty"`
}

type TimedRecurrence struct {
	Kind               string   `json:"kind" bson:"kind,omitempty"`
	SelectedDays       []string `json:"selectedDays" bson:"selectedDays,omitempty"`
	SelectedDaysOfWeek []int    `json:"selectedDaysOfWeek" bson:"selectedDaysOfWeek,omitempty"`
	StartOnMonday      *bool    `json:"startOnMonday" bson:"startOnMonday,omitempty"`
}

// Representation of an Event in the mongoDB database
type Event struct {
	Id          primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	ShortId     *string            `json:"shortId" bson:"shortId,omitempty"`
	OwnerId     primitive.ObjectID `json:"ownerId" bson:"ownerId,omitempty"`
	Name        string             `json:"name" bson:"name,omitempty"`
	Description *string            `json:"description" bson:"description,omitempty"`
	IsArchived  *bool              `json:"isArchived" bson:"isArchived,omitempty"`
	IsDeleted   *bool              `json:"isDeleted" bson:"isDeleted,omitempty"`

	Duration                 *float32             `json:"duration" bson:"duration,omitempty"`
	Dates                    []primitive.DateTime `json:"dates" bson:"dates,omitempty"`
	NotificationsEnabled     *bool                `json:"notificationsEnabled" bson:"notificationsEnabled,omitempty"`
	SendEmailAfterXResponses *int                 `json:"sendEmailAfterXResponses" bson:"sendEmailAfterXResponses,omitempty"`
	When2meetHref            *string              `json:"when2meetHref" bson:"when2meetHref,omitempty"`
	CollectEmails            *bool                `json:"collectEmails" bson:"collectEmails,omitempty"`
	TimeIncrement            *int                 `json:"timeIncrement" bson:"timeIncrement,omitempty"`
	EnabledSlots             []primitive.DateTime `json:"enabledSlots" bson:"enabledSlots,omitempty"`
	ActiveSlots              []primitive.DateTime `json:"activeSlots" bson:"activeSlots,omitempty"`
	EventTimezone            *string              `json:"eventTimezone" bson:"eventTimezone,omitempty"`
	SlotGeneration           *SlotGeneration      `json:"slotGeneration" bson:"slotGeneration,omitempty"`
	TimedRecurrence          *TimedRecurrence     `json:"timedRecurrence" bson:"timedRecurrence,omitempty"`

	// Used for specific times for specific dates feature
	HasSpecificTimes *bool                `json:"hasSpecificTimes" bson:"hasSpecificTimes,omitempty"`
	Times            []primitive.DateTime `json:"times" bson:"times,omitempty"`

	Type EventType `json:"type" bson:"type,omitempty"`

	// PostHog ID for the event creator
	CreatorPosthogId *string `json:"creatorPosthogId" bson:"creatorPosthogId,omitempty"`

	// Sign up form details
	IsSignUpForm    *bool                      `json:"isSignUpForm" bson:"isSignUpForm,omitempty"`
	SignUpBlocks    *[]SignUpBlock             `json:"signUpBlocks" bson:"signUpBlocks,omitempty"`
	SignUpResponses map[string]*SignUpResponse `json:"signUpResponses" bson:"signUpResponses"`

	// Whether to start the event on Monday (as opposed to Sunday, used for DOW events)
	StartOnMonday *bool `json:"startOnMonday" bson:"startOnMonday,omitempty"`

	// Whether to enable blind availability
	BlindAvailabilityEnabled *bool `json:"blindAvailabilityEnabled" bson:"blindAvailabilityEnabled,omitempty"`

	// Whether to only poll for days, not times
	DaysOnly *bool `json:"daysOnly" bson:"daysOnly,omitempty"`

	// Availability responses - old format for backward compatibility (fetched from eventResponses collection)
	ResponsesMap map[string]*Response `json:"responses" bson:"-"`

	// Used to store the number of responses for the event
	NumResponses *int `json:"numResponses" bson:"numResponses,omitempty"`

	// Scheduled event
	ScheduledEvent  *CalendarEvent `json:"scheduledEvent" bson:"scheduledEvent,omitempty"`
	CalendarEventId string         `json:"calendarEventId" bson:"calendarEventId,omitempty"`

	// Remindees
	Remindees *[]Remindee `json:"remindees" bson:"remindees,omitempty"`

	// Attendees for an availability group (fetched from Attendees collection)
	Attendees *[]Attendee `json:"attendees" bson:"-"`

	// Whether the user has responded to the availability group (fetched based on whether user is in Attendees)
	HasResponded *bool `json:"hasResponded" bson:"-"`
}

func (e *Event) GetId() string {
	if e.ShortId != nil {
		return *e.ShortId
	}

	return e.Id.Hex()
}
