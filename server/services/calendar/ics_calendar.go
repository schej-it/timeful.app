package calendar

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/emersion/go-ical"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
	"schej.it/server/utils"
)

type ICSCalendar struct {
	models.ICSCalendarAuth
}

func (cal *ICSCalendar) GetCalendarList() (map[string]models.SubCalendar, error) {
	return map[string]models.SubCalendar{
		"default": {
			Name:    cal.Label,
			Enabled: utils.TruePtr(),
		},
	}, nil
}

func (cal *ICSCalendar) GetCalendarEvents(calendarId string, timeMin time.Time, timeMax time.Time) ([]models.CalendarEvent, error) {
	// Fetch the data and ensure the fetch was successful
	resp, err := http.Get(cal.FeedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ICS feed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ICS feed returned status %d", resp.StatusCode)
	}

	// Parse
	decoder := ical.NewDecoder(resp.Body)
	parsedCal, err := decoder.Decode()
	if err != nil {
		return nil, fmt.Errorf("failed to parse ICS data: %v", err)
	}

	var events []models.CalendarEvent

	// Loop through parsed data and append each to events array
	for _, component := range parsedCal.Children {
		if component.Name != ical.CompEvent {
			continue
		}

		summary := component.Props.Get(ical.PropSummary)
		uid := component.Props.Get(ical.PropUID)
		dtStart := component.Props.Get(ical.PropDateTimeStart)
		dtEnd := component.Props.Get(ical.PropDateTimeEnd)

		if dtStart == nil || dtEnd == nil {
			continue
		}

		allDay := false
		var startTime, endTime time.Time

		// Check that event is not all day
		if !strings.Contains(dtStart.Value, "T") {
			startTime, _ = time.Parse("20060102", dtStart.Value)
			endTime, _ = time.Parse("20060102", dtEnd.Value)
			allDay = true
		} else {
			startTime, err = parseTimeWithTZ(dtStart)
			if err != nil {
				continue
			}

			endTime, err = parseTimeWithTZ(dtEnd)
			if err != nil {
				continue
			}
		}

		if endTime.Before(timeMin) || startTime.After(timeMax) {
			continue
		}

		free := false
		if transp := component.Props.Get(ical.PropTransparency); transp != nil {
			// TRANSPARENT means free, OPAQUE means busy
			free = strings.EqualFold(transp.Value, "TRANSPARENT")
		}

		summaryStr := ""
		if summary != nil {
			summaryStr = summary.Value
		}

		uidStr := ""
		if uid != nil {
			uidStr = uid.Value
		}

		events = append(events, models.CalendarEvent{
			Id:         uidStr,
			CalendarId: calendarId,
			Summary:    summaryStr,
			StartDate:  primitive.NewDateTimeFromTime(startTime),
			EndDate:    primitive.NewDateTimeFromTime(endTime),
			Free:       free,
			AllDay:     allDay,
		})
	}

	return events, nil
}
