package calendar

import (
	"errors"
	"testing"

	"github.com/emersion/go-ical"
)

func TestPanicToErrorPreservesErrors(t *testing.T) {
	expected := errors.New("calendar failed")

	if got := panicToError(expected); got != expected {
		t.Fatalf("panicToError() = %v, want original error", got)
	}
}

func TestPanicToErrorConvertsStrings(t *testing.T) {
	got := panicToError("calendar failed")
	if got == nil || got.Error() != "calendar failed" {
		t.Fatalf("panicToError() = %v, want string converted to error", got)
	}
}

func TestParseTimeWithTZRejectsMissingProperty(t *testing.T) {
	if _, err := parseTimeWithTZ(nil); err == nil {
		t.Fatal("parseTimeWithTZ(nil) succeeded, want error")
	}
}

func TestParseTimeWithTZParsesTimezone(t *testing.T) {
	got, err := parseTimeWithTZ(&ical.Prop{
		Value:  "20260507T090000Z",
		Params: ical.Params{},
	})
	if err != nil {
		t.Fatalf("parseTimeWithTZ() returned error: %v", err)
	}

	if got.UTC().Format("2006-01-02T15:04:05Z") != "2026-05-07T09:00:00Z" {
		t.Fatalf("parseTimeWithTZ() = %s, want UTC timestamp", got.UTC())
	}
}
