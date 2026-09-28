package main

import (
	"context"
	"os"
	"strings"
	"time"

	"github.com/jonyTF/go-webdav"
	"github.com/jonyTF/go-webdav/caldav"
	"schej.it/server/utils"
)

func main() {
	// Apple ID email and app-specific password (https://support.apple.com/en-us/102654)
	httpClient := webdav.HTTPClientWithBasicAuth(nil, os.Getenv("APPLE_ID_EMAIL"), os.Getenv("APPLE_APP_PASSWORD"))

	webdavClient, err := webdav.NewClient(httpClient, "https://caldav.icloud.com")
	if err != nil {
		panic(err)
	}

	caldavClient, err := caldav.NewClient(httpClient, "https://caldav.icloud.com")
	if err != nil {
		panic(err)
	}

	principal, err := webdavClient.FindCurrentUserPrincipal(context.Background())
	if err != nil {
		panic(err)
	}

	calendarHomeSet, err := caldavClient.FindCalendarHomeSet(context.Background(), principal)
	if err != nil {
		panic(err)
	}

	calendars, err := caldavClient.FindCalendars(context.Background(), calendarHomeSet)
	if err != nil {
		panic(err)
	}

	// Only include calendars that support VEVENT
	var filteredCalendars []caldav.Calendar
	for _, calendar := range calendars {
		for _, supportedComponent := range calendar.SupportedComponentSet {
			if supportedComponent == "VEVENT" {
				filteredCalendars = append(filteredCalendars, calendar)
				break
			}
		}
	}

	utils.PrintJson(filteredCalendars)

	for _, calendar := range filteredCalendars {
		if calendar.Name != "idk" {
			continue
		}

		events, err := caldavClient.QueryCalendar(context.Background(), calendar.Path, &caldav.CalendarQuery{
			CompRequest: caldav.CalendarCompRequest{
				Name: "VCALENDAR",
				Comps: []caldav.CalendarCompRequest{{
					Name: "VEVENT",
					Props: []string{
						"SUMMARY",
						"UID",
						"DTSTART",
						"DTEND",
						"DURATION",
					},
				}},
				Expand: &caldav.CalendarExpandRequest{
					Start: time.Now(),
					End:   time.Now().Add(time.Hour * 7 * 24),
				},
			},
			CompFilter: caldav.CompFilter{
				Name: "VCALENDAR",
				Comps: []caldav.CompFilter{{
					Name:  "VEVENT",
					Start: time.Now(),
					End:   time.Now().Add(time.Hour * 7 * 24),
				}},
			},
		})
		if err != nil {
			panic(err)
		}

		utils.PrintJson(events)

		var filteredEvents []caldav.CalendarObject
		for _, event := range events {
			// Filter out all day events
			startTime := event.Data.Children[0].Props["DTSTART"][0].Value
			if !strings.Contains(startTime, "T") {
				continue
			}

			filteredEvents = append(filteredEvents, event)
		}

		utils.PrintJson(filteredEvents)
	}
}
