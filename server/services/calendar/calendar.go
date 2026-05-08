package calendar

import (
	"time"

	"schej.it/server/models"
	"schej.it/server/services/auth"
)

type GetCalendarListData struct {
	CalendarList       map[string]models.SubCalendar `json:"calendarList"`
	CalendarAccountKey string                        `json:"calendarAccountKey"`
	Error              error                         `json:"error"`
}

// Calls GetCalendarList but broadcasts the result to channel
func GetCalendarListAsync(calendarAccountKey string, calendarProvider *CalendarProvider, c chan GetCalendarListData) {
	// Recover from panics
	defer func() {
		if err := recover(); err != nil {
			c <- GetCalendarListData{Error: err.(error)}
		}
	}()

	calendarList, err := (*calendarProvider).GetCalendarList()

	c <- GetCalendarListData{CalendarList: calendarList, CalendarAccountKey: calendarAccountKey, Error: err}
}

type GetCalendarEventsData struct {
	CalendarEvents     []models.CalendarEvent `json:"calendarEvents"`
	CalendarAccountKey string                 `json:"calendarAccountKey"`
	Error              error                  `json:"error"`
}

// Get the user's list of calendar events for the given calendar
func GetCalendarEventsAsync(calendarAccountKey string, calendarProvider *CalendarProvider, calendarId string, timeMin time.Time, timeMax time.Time, c chan GetCalendarEventsData) {
	// Recover from panics
	defer func() {
		if err := recover(); err != nil {
			c <- GetCalendarEventsData{Error: err.(error)}
		}
	}()

	calendarEvents, err := (*calendarProvider).GetCalendarEvents(calendarId, timeMin, timeMax)

	c <- GetCalendarEventsData{CalendarEvents: calendarEvents, CalendarAccountKey: calendarAccountKey, Error: err}
}

type CalendarEventsWithError struct {
	CalendarEvents []models.CalendarEvent `json:"calendarEvents"`
	Error          error                  `json:"error,omitempty"`
}

// Returns a map mapping email to the calendar events associated with that email, and an error if there was an error fetching events for that email
func GetUsersCalendarEvents(user *models.User, accounts models.Set[string], timeMin time.Time, timeMax time.Time) (map[string]CalendarEventsWithError, bool) {
	auth.RefreshUserTokenIfNecessary(user, accounts)

	returnAllAccounts := len(accounts) == 0
	editedCalendarAccounts := false

	calendarEventsMap := make(map[string]CalendarEventsWithError)

	calendarListChan := make(chan GetCalendarListData)
	calendarEventsChan := make(chan GetCalendarEventsData)

	// Get calendar lists
	numCalendarListRequests := 0
	for calendarAccountKey, account := range user.CalendarAccounts {
		calendarProvider := GetCalendarProvider(account)

		// Get secondary account calendars
		if _, ok := accounts[calendarAccountKey]; ok || returnAllAccounts {
			go GetCalendarListAsync(calendarAccountKey, &calendarProvider, calendarListChan)
			numCalendarListRequests++

			calendarEventsMap[calendarAccountKey] = CalendarEventsWithError{
				CalendarEvents: make([]models.CalendarEvent, 0),
			}
		}
	}

	// After each calendar list is fetched, get the calendar events from each calendar
	numCalendarEventsRequests := 0
	for i := 0; i < numCalendarListRequests; i++ {
		calendarListData := <-calendarListChan

		if calendarListData.Error != nil {
			// This is needed to be able to send an error back to user if a given calendar account's refresh token is invalid, for example
			go func() { // needs to be async because writing to a channel is blocking
				calendarEventsChan <- GetCalendarEventsData{CalendarAccountKey: calendarListData.CalendarAccountKey, Error: calendarListData.Error}
			}()
			numCalendarEventsRequests++
			continue
		}

		// Edit subcalendars map
		account := user.CalendarAccounts[calendarListData.CalendarAccountKey]
		calendarProvider := GetCalendarProvider(account)
		if account.SubCalendars == nil {
			account.SubCalendars = &calendarListData.CalendarList
			user.CalendarAccounts[calendarListData.CalendarAccountKey] = account
			editedCalendarAccounts = true
		} else {
			// Add subCalendar if it doesn't exist
			for id, subCalendar := range calendarListData.CalendarList {
				if _, ok := (*account.SubCalendars)[id]; !ok {
					(*account.SubCalendars)[id] = subCalendar

					if !editedCalendarAccounts {
						editedCalendarAccounts = true
					}
				}
			}

			// Remove subCalendar if it no longer exists
			for id := range *account.SubCalendars {
				if _, ok := calendarListData.CalendarList[id]; !ok {
					delete(*account.SubCalendars, id)

					if !editedCalendarAccounts {
						editedCalendarAccounts = true
					}
				}
			}
		}
		user.CalendarAccounts[calendarListData.CalendarAccountKey] = account

		for id := range *account.SubCalendars {
			go GetCalendarEventsAsync(calendarListData.CalendarAccountKey, &calendarProvider, id, timeMin, timeMax, calendarEventsChan)
			numCalendarEventsRequests++
		}
	}

	// After calendar events are fetched, append to the calendarEvents array associated with the given email
	for i := 0; i < numCalendarEventsRequests; i++ {
		calendarEventsData := <-calendarEventsChan
		calendarAccountKey := calendarEventsData.CalendarAccountKey

		if _, ok := calendarEventsMap[calendarAccountKey]; !ok {
			calendarEventsMap[calendarAccountKey] = CalendarEventsWithError{}
		}

		if events, ok := calendarEventsMap[calendarAccountKey]; ok {
			if calendarEventsData.Error != nil {
				events.Error = calendarEventsData.Error
			} else {
				events.CalendarEvents = append(events.CalendarEvents, calendarEventsData.CalendarEvents...)
			}
			calendarEventsMap[calendarAccountKey] = events
		}
	}

	return calendarEventsMap, editedCalendarAccounts
}
