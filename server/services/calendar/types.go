package calendar

import (
	"time"

	"schej.it/server/models"
)

type CalendarProvider interface {
	GetCalendarList() (map[string]models.SubCalendar, error)
	GetCalendarEvents(calendarId string, timeMin time.Time, timeMax time.Time) ([]models.CalendarEvent, error)
}

func GetCalendarProvider(calendarAccount models.CalendarAccount) CalendarProvider {
	switch calendarAccount.CalendarType {
	case models.GoogleCalendarType:
		return &GoogleCalendar{
			OAuth2CalendarAuth: *calendarAccount.OAuth2CalendarAuth,
		}
	case models.OutlookCalendarType:
		return &OutlookCalendar{
			OAuth2CalendarAuth: *calendarAccount.OAuth2CalendarAuth,
		}
	case models.AppleCalendarType:
		return &AppleCalendar{
			AppleCalendarAuth: *calendarAccount.AppleCalendarAuth,
		}
	case models.ICSCalendarType:
		return &ICSCalendar{
			ICSCalendarAuth: *calendarAccount.ICSCalendarAuth,
		}
	}
	return nil
}
