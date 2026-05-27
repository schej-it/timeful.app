package routes

import (
	"encoding/json"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/models"
	"schej.it/server/respondents"
)

func TestGuestResponseLookupKeyUsesOpaqueGuestId(t *testing.T) {
	response := models.EventResponse{
		UserId: "legacy-name",
		Response: &models.Response{
			Name:               "Ada",
			GuestId:            "guest_opaque_id",
			GuestOwnershipMode: guestOwnershipModeToken,
		},
	}

	if key := guestResponseLookupKey(response); key != "guest_opaque_id" {
		t.Fatalf("expected opaque guest id lookup key, got %q", key)
	}
}

func TestCanMutateGuestResponseRequiresTokenForProtectedResponses(t *testing.T) {
	response := &models.Response{
		Name:               "Ada",
		GuestId:            "guest_opaque_id",
		GuestEditToken:     "secret-token",
		GuestEditPolicy:    guestEditPolicyProtected,
		GuestOwnershipMode: guestOwnershipModeToken,
	}

	if canMutateGuestResponse(response, "", "") {
		t.Fatal("expected protected response to reject missing token")
	}
	if canMutateGuestResponse(response, "", "wrong-token") {
		t.Fatal("expected protected response to reject wrong token")
	}
	if !canMutateGuestResponse(response, "", "secret-token") {
		t.Fatal("expected protected response to accept matching token")
	}
}

func TestCanMutateGuestResponseAllowsOpenResponsesWithoutToken(t *testing.T) {
	openResponse := &models.Response{
		Name:               "Ada",
		GuestId:            "guest_opaque_id",
		GuestEditPolicy:    guestEditPolicyOpen,
		GuestOwnershipMode: guestOwnershipModeToken,
	}

	if !canMutateGuestResponse(openResponse, "", "") {
		t.Fatal("expected open guest response to allow edits without token")
	}
}

func TestCanMutateGuestResponseAllowsLegacySelfOnly(t *testing.T) {
	legacyResponse := &models.Response{Name: "Legacy Ada"}

	if !canMutateGuestResponse(legacyResponse, "Legacy Ada", "") {
		t.Fatal("expected legacy guest response to allow self edits")
	}
	if canMutateGuestResponse(legacyResponse, "Different Guest", "") {
		t.Fatal("expected legacy guest response to reject edits from other guests")
	}
}

func TestEnsureGuestTokenOwnershipUpgradesLegacyGuestResponse(t *testing.T) {
	response := &models.Response{Name: "Ada"}

	credentials := ensureGuestTokenOwnership(response, guestEditPolicyProtected)
	if credentials == nil {
		t.Fatal("expected guest credentials to be generated")
	}
	if response.GuestId == "" || response.GuestEditToken == "" {
		t.Fatal("expected opaque guest credentials to be stored on the response")
	}
	if response.GuestOwnershipMode != guestOwnershipModeToken {
		t.Fatalf("expected token ownership mode, got %q", response.GuestOwnershipMode)
	}
	if response.GuestEditPolicy != guestEditPolicyProtected {
		t.Fatalf("expected protected policy, got %q", response.GuestEditPolicy)
	}
}

func TestGetResponsesMapUsesLegacyAndTokenGuestKeys(t *testing.T) {
	signedInUserID := primitive.NewObjectID().Hex()

	responses := []models.EventResponse{
		{
			UserId: "legacy-user-id",
			Response: &models.Response{
				Name: "Legacy Ada",
			},
		},
		{
			UserId: "stale-name-key",
			Response: &models.Response{
				Name:               "Token Ada",
				GuestId:            "guest_opaque_id",
				GuestOwnershipMode: guestOwnershipModeToken,
			},
		},
		{
			UserId:   signedInUserID,
			Response: &models.Response{},
		},
	}

	responseMap := getResponsesMap(responses)
	if _, exists := responseMap["Legacy Ada"]; !exists {
		t.Fatal("expected legacy guest response to remain keyed by guest name")
	}
	if _, exists := responseMap["guest_opaque_id"]; !exists {
		t.Fatal("expected token-backed guest response to be keyed by guest id")
	}
	if _, exists := responseMap[signedInUserID]; !exists {
		t.Fatal("expected signed-in response to remain keyed by user id")
	}
}

func TestNormalizeGuestResponseForPayloadSetsLegacyOwnershipMode(t *testing.T) {
	response := &models.Response{Name: "Legacy Ada"}

	normalizeGuestResponseForPayload(response)

	if response.GuestOwnershipMode != guestOwnershipModeLegacy {
		t.Fatalf("expected legacy ownership mode, got %q", response.GuestOwnershipMode)
	}
	if response.GuestEditPolicy != "" {
		t.Fatalf("expected legacy guest edit policy to be empty, got %q", response.GuestEditPolicy)
	}
}

func TestNormalizeGuestResponseForPayloadNormalizesTokenPolicy(t *testing.T) {
	response := &models.Response{
		Name:               "Token Ada",
		GuestId:            "guest_opaque_id",
		GuestEditToken:     "secret-token",
		GuestEditPolicy:    "",
		GuestOwnershipMode: guestOwnershipModeToken,
	}

	normalizeGuestResponseForPayload(response)

	if response.GuestOwnershipMode != guestOwnershipModeToken {
		t.Fatalf("expected token ownership mode, got %q", response.GuestOwnershipMode)
	}
	if response.GuestEditPolicy != guestEditPolicyProtected {
		t.Fatalf("expected protected policy normalization, got %q", response.GuestEditPolicy)
	}
}

func TestGuestResponseJSONOmitsRawEditTokenAndIncludesOwnershipMetadata(t *testing.T) {
	response := &models.Response{
		Name:               "Token Ada",
		GuestId:            "guest_opaque_id",
		GuestEditToken:     "secret-token",
		GuestEditPolicy:    guestEditPolicyProtected,
		GuestOwnershipMode: guestOwnershipModeToken,
	}

	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	jsonText := string(payload)

	if strings.Contains(jsonText, "secret-token") || strings.Contains(jsonText, "guestEditToken") {
		t.Fatalf("expected raw guest edit token to stay private, got %s", jsonText)
	}
	if !strings.Contains(jsonText, `"guestOwnershipMode":"token"`) {
		t.Fatalf("expected ownership mode in payload, got %s", jsonText)
	}
	if !strings.Contains(jsonText, `"guestEditPolicy":"protected"`) {
		t.Fatalf("expected guest edit policy in payload, got %s", jsonText)
	}
}

func TestHasValidGuestNameRejectsBlankNames(t *testing.T) {
	if hasValidGuestName("") {
		t.Fatal("expected empty guest name to be invalid")
	}
	if hasValidGuestName("   ") {
		t.Fatal("expected whitespace-only guest name to be invalid")
	}
	if hasValidGuestName("507f1f77bcf86cd799439011") {
		t.Fatal("expected object-id-like guest name to be invalid")
	}
	if !hasValidGuestName(" A\u200bda ") {
		t.Fatal("expected non-empty guest name to be valid")
	}
}

func TestCanonicalGuestNameStripsFormattingAndNormalizesUnicode(t *testing.T) {
	if canonicalName := canonicalGuestName(" A\u200bda\u0301 "); canonicalName != "Adá" {
		t.Fatalf("expected canonical guest name, got %q", canonicalName)
	}
}

func TestGuestNameValidationErrorMessageUsesSpecificMessages(t *testing.T) {
	if message := guestNameValidationErrorMessage(respondents.GuestNameRequired); message != "Guest name is required" {
		t.Fatalf("unexpected required guest name message %q", message)
	}
	if message := guestNameValidationErrorMessage(respondents.GuestNameInvalidFormatting); message == "" {
		t.Fatal("expected invalid-formatting message")
	}
	if message := guestNameValidationErrorMessage(respondents.GuestNameObjectIDLike); message == "" {
		t.Fatal("expected object-id-like message")
	}
	if message := guestNameValidationErrorMessage(respondents.GuestNameTooLong); message == "" {
		t.Fatal("expected too-long message")
	}
}

func TestShouldExposeGuestResponsePayload(t *testing.T) {
	if !shouldExposeGuestResponsePayload("", &models.Response{Name: "Ada"}) {
		t.Fatal("expected named guest payload row to be exposed")
	}
	if shouldExposeGuestResponsePayload("", &models.Response{Name: ""}) {
		t.Fatal("expected blank-named guest payload row to be hidden")
	}
	if shouldExposeGuestResponsePayload("", &models.Response{
		Name:               "   ",
		GuestId:            generateOpaqueGuestCredential(12),
		GuestOwnershipMode: guestOwnershipModeToken,
	}) {
		t.Fatal("expected whitespace-only token guest payload row to be hidden")
	}
	if !shouldExposeGuestResponsePayload("", &models.Response{
		UserId: primitive.NewObjectID(),
	}) {
		t.Fatal("expected signed-in payload row to remain exposed")
	}
}

func TestShouldExposeGuestSignUpResponsePayload(t *testing.T) {
	if !shouldExposeGuestSignUpResponsePayload("", &models.SignUpResponse{Name: "Ada"}) {
		t.Fatal("expected named guest sign-up payload row to be exposed")
	}
	if shouldExposeGuestSignUpResponsePayload("", &models.SignUpResponse{Name: ""}) {
		t.Fatal("expected blank-named guest sign-up payload row to be hidden")
	}
	if shouldExposeGuestSignUpResponsePayload("", &models.SignUpResponse{Name: "   "}) {
		t.Fatal("expected whitespace-only guest sign-up payload row to be hidden")
	}
	if !shouldExposeGuestSignUpResponsePayload("", &models.SignUpResponse{
		UserId: primitive.NewObjectID(),
	}) {
		t.Fatal("expected signed-in sign-up payload row to remain exposed")
	}
}

func TestFindGuestResponseByNameUsesCanonicalNormalizedNames(t *testing.T) {
	responses := []models.EventResponse{
		{
			UserId: "legacy-guest",
			Response: &models.Response{
				Name: "  A\u200bda\u0301  ",
			},
		},
	}

	index, response := findGuestResponseByName(responses, "Adá")
	if index != 0 || response == nil {
		t.Fatalf("expected canonical lookup to find guest response, got index=%d response=%v", index, response)
	}
}
