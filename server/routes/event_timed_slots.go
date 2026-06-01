package routes

import (
	"errors"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
)

var errActiveSlotOutsideEnabled = errors.New("active-slots-must-be-enabled")

type timedEventPayloadFields struct {
	EnabledSlots    []primitive.DateTime    `json:"enabledSlots"`
	ActiveSlots     []primitive.DateTime    `json:"activeSlots"`
	EventTimezone   *string                 `json:"eventTimezone"`
	SlotGeneration  *models.SlotGeneration  `json:"slotGeneration"`
	TimedRecurrence *models.TimedRecurrence `json:"timedRecurrence"`
}

func normalizeDateTimes(values []primitive.DateTime) []primitive.DateTime {
	if len(values) == 0 {
		return []primitive.DateTime{}
	}

	seen := make(map[int64]struct{}, len(values))
	normalized := make([]primitive.DateTime, 0, len(values))
	for _, value := range values {
		ms := int64(value)
		if _, exists := seen[ms]; exists {
			continue
		}
		seen[ms] = struct{}{}
		normalized = append(normalized, value)
	}

	sort.Slice(normalized, func(i, j int) bool {
		return normalized[i].Time().Before(normalized[j].Time())
	})

	return normalized
}

func buildLegacyTimedSlots(
	dates []primitive.DateTime,
	durationHours *float32,
	timeIncrementMinutes *int,
) []primitive.DateTime {
	if len(dates) == 0 || durationHours == nil {
		return []primitive.DateTime{}
	}

	incrementMinutes := 15
	if timeIncrementMinutes != nil && *timeIncrementMinutes > 0 {
		incrementMinutes = *timeIncrementMinutes
	}

	durationMinutes := int(time.Duration(float64(*durationHours) * float64(time.Hour)).Minutes())
	if durationMinutes <= 0 {
		return []primitive.DateTime{}
	}

	slots := make([]primitive.DateTime, 0)
	for _, date := range normalizeDateTimes(dates) {
		current := date.Time().UTC()
		end := current.Add(time.Duration(durationMinutes) * time.Minute)
		for current.Before(end) {
			slots = append(slots, primitive.NewDateTimeFromTime(current))
			current = current.Add(time.Duration(incrementMinutes) * time.Minute)
		}
	}

	return normalizeDateTimes(slots)
}

func normalizeTimedEventPayloadFields(
	fields timedEventPayloadFields,
	dates []primitive.DateTime,
	durationHours *float32,
	timeIncrementMinutes *int,
) (timedEventPayloadFields, error) {
	enabledSlots := normalizeDateTimes(fields.EnabledSlots)
	if len(enabledSlots) == 0 {
		enabledSlots = buildLegacyTimedSlots(dates, durationHours, timeIncrementMinutes)
	}

	activeSlots := normalizeDateTimes(fields.ActiveSlots)
	if len(activeSlots) == 0 {
		activeSlots = enabledSlots
	}

	enabledLookup := make(map[int64]struct{}, len(enabledSlots))
	for _, slot := range enabledSlots {
		enabledLookup[int64(slot)] = struct{}{}
	}
	for _, slot := range activeSlots {
		if _, exists := enabledLookup[int64(slot)]; !exists {
			return timedEventPayloadFields{}, errActiveSlotOutsideEnabled
		}
	}

	fields.EnabledSlots = enabledSlots
	fields.ActiveSlots = activeSlots

	if fields.EventTimezone == nil && len(enabledSlots) > 0 {
		defaultTimezone := "UTC"
		fields.EventTimezone = &defaultTimezone
	}

	return fields, nil
}
