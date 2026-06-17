package routes

import (
	"schej.it/server/db"
	"schej.it/server/models"
	"schej.it/server/respondents"
)

func cloneUser(user *models.User) *models.User {
	if user == nil {
		return nil
	}

	clone := *user
	return &clone
}

func sanitizedResponseUser(user *models.User) *models.User {
	sanitized := cloneUser(user)
	if sanitized == nil {
		return nil
	}

	firstName, lastName, _ := respondents.SanitizeUserDisplayName(sanitized)
	sanitized.FirstName = firstName
	sanitized.LastName = lastName

	return sanitized
}

func canonicalGuestName(name string) string {
	validation := respondents.ValidateGuestName(name)
	if validation.Code != respondents.GuestNameValid {
		return ""
	}

	return validation.Name
}

func guestNameValidationErrorMessage(code respondents.GuestNameValidationCode) string {
	switch code {
	case respondents.GuestNameRequired:
		return "Guest name is required"
	case respondents.GuestNameInvalidFormatting:
		return "Guest name contains only unsupported formatting characters"
	case respondents.GuestNameObjectIDLike:
		return "Guest name cannot look like an account ID"
	case respondents.GuestNameTooLong:
		return "Guest name must be 100 characters or fewer"
	default:
		return "Guest name is invalid"
	}
}

func populateResponsePayloadIdentity(response *models.Response, storedUserId string) (string, bool) {
	if response == nil {
		return "", false
	}

	if resolvedUserID, ok := respondents.ResolveStoredUserID(response.UserId, storedUserId); ok {
		response.UserId = resolvedUserID
		lookupKey := resolvedUserID.Hex()
		var liveUser *models.User
		if db.UsersCollection != nil {
			liveUser = db.GetUserById(lookupKey)
		}
		if liveUser != nil {
			response.User = sanitizedResponseUser(liveUser)
		} else {
			fallbackName := respondents.NormalizeGuestName(response.Name)
			response.User = &models.User{
				Id:        resolvedUserID,
				FirstName: fallbackName,
				Email:     response.Email,
			}
		}
		return lookupKey, true
	}

	name := canonicalGuestName(response.Name)
	if name == "" {
		return "", false
	}

	response.Name = name
	response.User = &models.User{
		FirstName: name,
		Email:     response.Email,
	}

	return guestResponseLookupKey(models.EventResponse{UserId: storedUserId, Response: response}), true
}

func populateSignUpResponsePayloadIdentity(response *models.SignUpResponse, storedUserId string) (string, bool) {
	if response == nil {
		return "", false
	}

	if resolvedUserID, ok := respondents.ResolveStoredUserID(response.UserId, storedUserId); ok {
		response.UserId = resolvedUserID
		lookupKey := resolvedUserID.Hex()
		var liveUser *models.User
		if db.UsersCollection != nil {
			liveUser = db.GetUserById(lookupKey)
		}
		if liveUser != nil {
			response.User = sanitizedResponseUser(liveUser)
		} else {
			fallbackName := respondents.NormalizeGuestName(response.Name)
			response.User = &models.User{
				Id:        resolvedUserID,
				FirstName: fallbackName,
				Email:     response.Email,
			}
		}
		return lookupKey, true
	}

	name := canonicalGuestName(response.Name)
	if name == "" {
		return "", false
	}

	response.Name = name
	response.User = &models.User{
		FirstName: name,
		Email:     response.Email,
	}

	return name, true
}
