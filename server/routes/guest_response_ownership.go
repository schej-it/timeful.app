package routes

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
	"schej.it/server/respondents"
)

const (
	guestEditPolicyProtected = "protected"
	guestEditPolicyOpen      = "open"

	guestOwnershipModeLegacy = "legacy"
	guestOwnershipModeToken  = "token"
)

type guestCredentialsResponse struct {
	Name               string `json:"name,omitempty"`
	GuestId            string `json:"guestId"`
	GuestEditToken     string `json:"guestEditToken"`
	GuestEditPolicy    string `json:"guestEditPolicy"`
	GuestOwnershipMode string `json:"guestOwnershipMode"`
}

type guestResponseMutationResult struct {
	GuestCredentials *guestCredentialsResponse `json:"guestCredentials,omitempty"`
}

func isGuestResponseRecord(eventResponse models.EventResponse) bool {
	return eventResponse.Response != nil && eventResponse.Response.UserId == primitive.NilObjectID
}

func isTokenBackedGuestResponse(response *models.Response) bool {
	return response != nil &&
		response.GuestOwnershipMode == guestOwnershipModeToken &&
		response.GuestId != ""
}

func guestResponseLookupKey(eventResponse models.EventResponse) string {
	if isTokenBackedGuestResponse(eventResponse.Response) {
		return eventResponse.Response.GuestId
	}
	if eventResponse.Response != nil {
		if canonicalName := canonicalGuestName(eventResponse.Response.Name); canonicalName != "" {
			return canonicalName
		}
	}
	return eventResponse.UserId
}

func guestQueryLookupKey(guestId string, guestName string) string {
	if guestId != "" {
		return guestId
	}
	return canonicalGuestName(guestName)
}

func normalizeGuestEditPolicy(policy string) string {
	if policy == guestEditPolicyOpen {
		return guestEditPolicyOpen
	}
	return guestEditPolicyProtected
}

func generateOpaqueGuestCredential(numBytes int) string {
	bytes := make([]byte, numBytes)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}

func buildGuestCredentialsResponse(
	response *models.Response,
	fallbackName string,
) *guestCredentialsResponse {
	if response == nil || !isTokenBackedGuestResponse(response) || response.GuestEditToken == "" {
		return nil
	}

	name := response.Name
	if canonicalName := canonicalGuestName(name); canonicalName != "" {
		name = canonicalName
	} else if canonicalFallback := canonicalGuestName(fallbackName); canonicalFallback != "" {
		name = canonicalFallback
	}

	return &guestCredentialsResponse{
		Name:               name,
		GuestId:            response.GuestId,
		GuestEditToken:     response.GuestEditToken,
		GuestEditPolicy:    normalizeGuestEditPolicy(response.GuestEditPolicy),
		GuestOwnershipMode: guestOwnershipModeToken,
	}
}

func ensureGuestTokenOwnership(
	response *models.Response,
	requestedPolicy string,
) *guestCredentialsResponse {
	if response == nil {
		return nil
	}

	response.GuestId = nonEmptyOrFallback(response.GuestId, generateOpaqueGuestCredential(12))
	response.GuestEditToken = nonEmptyOrFallback(response.GuestEditToken, generateOpaqueGuestCredential(24))
	response.GuestEditPolicy = normalizeGuestEditPolicy(requestedPolicy)
	response.GuestOwnershipMode = guestOwnershipModeToken

	return buildGuestCredentialsResponse(response, response.Name)
}

func nonEmptyOrFallback(value string, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func findGuestResponseByGuestId(
	responses []models.EventResponse,
	guestId string,
) (int, *models.EventResponse) {
	if guestId == "" {
		return -1, nil
	}
	for i := range responses {
		response := &responses[i]
		if !isGuestResponseRecord(*response) {
			continue
		}
		if response.Response.GuestId == guestId {
			return i, response
		}
	}
	return -1, nil
}

func findGuestResponseByName(
	responses []models.EventResponse,
	name string,
) (int, *models.EventResponse) {
	if name == "" {
		return -1, nil
	}
	canonicalName := canonicalGuestName(name)
	if canonicalName == "" {
		return -1, nil
	}
	for i := range responses {
		response := &responses[i]
		if !isGuestResponseRecord(*response) {
			continue
		}
		if canonicalGuestName(response.Response.Name) == canonicalName {
			return i, response
		}
	}
	return -1, nil
}

func guestDisplayNameExists(
	responses []models.EventResponse,
	name string,
	excludeIndex int,
) bool {
	for i, response := range responses {
		if i == excludeIndex || !isGuestResponseRecord(response) {
			continue
		}
		if canonicalGuestName(response.Response.Name) == canonicalGuestName(name) {
			return true
		}
	}
	return false
}

func canMutateGuestResponse(
	response *models.Response,
	callerLookupKey string,
	providedToken string,
) bool {
	if response == nil {
		return false
	}
	if !isTokenBackedGuestResponse(response) {
		return callerLookupKey != "" && canonicalGuestName(response.Name) == callerLookupKey
	}
	if normalizeGuestEditPolicy(response.GuestEditPolicy) == guestEditPolicyOpen {
		return true
	}
	if providedToken == "" || response.GuestEditToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare(
		[]byte(response.GuestEditToken),
		[]byte(providedToken),
	) == 1
}

func normalizeGuestResponseForPayload(response *models.Response) {
	if response == nil {
		return
	}

	if isTokenBackedGuestResponse(response) {
		response.GuestOwnershipMode = guestOwnershipModeToken
		response.GuestEditPolicy = normalizeGuestEditPolicy(response.GuestEditPolicy)
		return
	}

	response.GuestOwnershipMode = guestOwnershipModeLegacy
	response.GuestEditPolicy = ""
}

func hasValidGuestName(name string) bool {
	return respondents.HasValidGuestName(name)
}

func shouldExposeGuestResponsePayload(_ string, response *models.Response) bool {
	if response == nil {
		return true
	}

	if response.UserId != primitive.NilObjectID {
		return true
	}

	return hasValidGuestName(response.Name)
}

func shouldExposeGuestSignUpResponsePayload(_ string, response *models.SignUpResponse) bool {
	if response == nil {
		return true
	}

	if response.UserId != primitive.NilObjectID {
		return true
	}

	return hasValidGuestName(response.Name)
}
