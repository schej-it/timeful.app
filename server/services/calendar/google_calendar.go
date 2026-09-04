package calendar

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/errs"
	"schej.it/server/logger"
	"schej.it/server/models"
	"schej.it/server/utils"
)

type GoogleCalendar struct {
	models.OAuth2CalendarAuth
}

func (calendar GoogleCalendar) GetCalendarList() (map[string]models.SubCalendar, error) {
	req, _ := http.NewRequest(
		"GET",
		"https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,summary,selected)",
		nil,
	)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", calendar.AccessToken))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer resp.Body.Close()

	// Define structs to parse json response
	type Response struct {
		Items []struct {
			Id       string `json:"id" bson:"id,omitempty"`
			Summary  string `json:"summary" bson:"summary,omitempty"`
			Selected bool   `json:"selected" bson:"selected,omitempty"`
		} `json:"items"`
		Error *errs.GoogleAPIError `json:"error"`
	}

	// Parse the response
	var res Response
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		logger.StdErr.Panicln(err)
	}

	// Check if the response returned an error
	if res.Error != nil {
		return nil, res.Error
	}

	// Append only the selected calendars
	calendars := make(map[string]models.SubCalendar)
	for _, calendar := range res.Items {
		var enabled *bool
		if calendar.Selected {
			enabled = utils.TruePtr()
		} else {
			enabled = utils.FalsePtr()
		}

		calendars[calendar.Id] = models.SubCalendar{
			Name:    calendar.Summary,
			Enabled: enabled,
		}
	}

	return calendars, nil
}

func (calendar *GoogleCalendar) GetCalendarEvents(calendarId string, timeMin time.Time, timeMax time.Time) ([]models.CalendarEvent, error) {
	min, _ := timeMin.MarshalText()
	max, _ := timeMax.MarshalText()
	req, _ := http.NewRequest(
		"GET",
		fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events?fields=items(id,summary,start,end,transparency,attendees)&timeMin=%s&timeMax=%s&singleEvents=true&eventTypes=default&eventTypes=outOfOffice", url.PathEscape(calendarId), min, max),
		nil,
	)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", calendar.AccessToken))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer resp.Body.Close()

	// Define some structs to parse the json response
	type Attendee struct {
		Self           bool   `json:"self"`
		ResponseStatus string `json:"responseStatus"`
	}
	type Response struct {
		Items []struct {
			Id      string `json:"id"`
			Summary string `json:"summary"`
			Start   struct {
				DateTime time.Time `json:"dateTime" binding:"required"`
				Date     string    `json:"date"`
			} `json:"start"`
			End struct {
				DateTime time.Time `json:"dateTime" binding:"required"`
				Date     string    `json:"date"`
			} `json:"end"`
			Transparency string     `json:"transparency"`
			Attendees    []Attendee `json:"attendees"`
		} `json:"items"`
		Error *errs.GoogleAPIError `json:"error"`
	}

	// Parse the response
	var res Response
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		logger.StdErr.Panicln(err)
	}

	// Check if the response returned an error
	if res.Error != nil {
		return nil, res.Error
	}

	// Format response to return
	calendarEvents := make([]models.CalendarEvent, 0)
	for _, item := range res.Items {
		startDate := item.Start.DateTime
		endDate := item.End.DateTime
		allDay := false

		// Handle all day events
		if item.Start.DateTime.IsZero() {
			startDate, _ = time.Parse(time.DateOnly, item.Start.Date)
			endDate, _ = time.Parse(time.DateOnly, item.End.Date)
			allDay = true
		}

		// Determine if user is free during this event
		free := false
		if item.Transparency == "transparent" {
			free = true
		} else if item.Attendees != nil {
			selfIndex := utils.Find(item.Attendees, func(a Attendee) bool { return a.Self })
			if selfIndex != -1 {
				free = item.Attendees[selfIndex].ResponseStatus != "accepted"
			}
		}

		// Restructure event
		calendarEvent := models.CalendarEvent{
			Id:         item.Id,
			CalendarId: calendarId,
			Summary:    item.Summary,
			StartDate:  primitive.NewDateTimeFromTime(startDate),
			EndDate:    primitive.NewDateTimeFromTime(endDate),
			Free:       free,
			AllDay:     allDay,
		}
		calendarEvents = append(calendarEvents, calendarEvent)
	}

	return calendarEvents, nil
}
