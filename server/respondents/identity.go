package respondents

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/text/unicode/norm"
	"schej.it/server/models"
)

const MaxGuestNameLength = 100

type GuestNameValidationCode string

const (
	GuestNameValid             GuestNameValidationCode = ""
	GuestNameRequired          GuestNameValidationCode = "required"
	GuestNameInvalidFormatting GuestNameValidationCode = "invalid_formatting"
	GuestNameObjectIDLike      GuestNameValidationCode = "object_id_like"
	GuestNameTooLong           GuestNameValidationCode = "too_long"
)

type GuestNameValidationResult struct {
	Name string
	Code GuestNameValidationCode
}

func stripDisallowedNameRunes(input string) string {
	var builder strings.Builder
	builder.Grow(len(input))

	for _, r := range input {
		if unicode.IsControl(r) || unicode.In(r, unicode.Cf) {
			continue
		}
		builder.WriteRune(r)
	}

	return builder.String()
}

func normalizeName(input string) string {
	stripped := stripDisallowedNameRunes(input)
	return strings.TrimSpace(norm.NFC.String(stripped))
}

func NormalizeGuestName(input string) string {
	return normalizeName(input)
}

func ValidateGuestName(input string) GuestNameValidationResult {
	trimmedInput := strings.TrimSpace(input)
	if trimmedInput == "" {
		return GuestNameValidationResult{Code: GuestNameRequired}
	}

	normalized := NormalizeGuestName(input)
	if normalized == "" {
		return GuestNameValidationResult{Code: GuestNameInvalidFormatting}
	}

	if utf8.RuneCountInString(normalized) > MaxGuestNameLength {
		return GuestNameValidationResult{Code: GuestNameTooLong}
	}

	if _, err := primitive.ObjectIDFromHex(normalized); err == nil {
		return GuestNameValidationResult{Code: GuestNameObjectIDLike}
	}

	return GuestNameValidationResult{
		Name: normalized,
		Code: GuestNameValid,
	}
}

func HasValidGuestName(input string) bool {
	return ValidateGuestName(input).Code == GuestNameValid
}

func SanitizeDisplayNamePart(input string) string {
	return normalizeName(input)
}

func SanitizeUserDisplayName(user *models.User) (firstName string, lastName string, displayName string) {
	if user == nil {
		return "", "", ""
	}

	firstName = SanitizeDisplayNamePart(user.FirstName)
	lastName = SanitizeDisplayNamePart(user.LastName)
	displayName = strings.TrimSpace(strings.Join([]string{firstName, lastName}, " "))

	return firstName, lastName, displayName
}
