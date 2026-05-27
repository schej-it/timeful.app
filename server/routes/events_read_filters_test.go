package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/models"
	"schej.it/server/utils"
)

var routesReadFiltersTestDBOnce sync.Once

func initRoutesReadFiltersTestDB(t *testing.T) {
	t.Helper()

	routesReadFiltersTestDBOnce.Do(func() {
		gin.SetMode(gin.TestMode)
		if os.Getenv("SESSION_SECRET") == "" {
			_ = os.Setenv("SESSION_SECRET", "01234567890123456789012345678901")
		}
		if os.Getenv("MONGODB_URI") == "" {
			_ = os.Setenv("MONGODB_URI", "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=2000&connectTimeoutMS=2000")
		}
		db.Init()
	})
}

func newEventsReadFiltersTestRouter() *gin.Engine {
	router := gin.New()
	store := cookie.NewStore([]byte(os.Getenv("SESSION_SECRET")))
	router.Use(sessions.Sessions("session", store))

	apiRouter := router.Group("/api")
	InitEvents(apiRouter)

	return router
}

func seedEventReadFiltersTestData(t *testing.T, event models.Event, responses []models.EventResponse, users []models.User) {
	t.Helper()

	initRoutesReadFiltersTestDB(t)

	ctx := context.Background()
	userIds := make([]primitive.ObjectID, 0, len(users))
	for _, user := range users {
		userIds = append(userIds, user.Id)
		if _, err := db.UsersCollection.InsertOne(ctx, user); err != nil {
			t.Fatalf("insert user: %v", err)
		}
	}
	if _, err := db.EventsCollection.InsertOne(ctx, event); err != nil {
		t.Fatalf("insert event: %v", err)
	}
	if len(responses) > 0 {
		responseDocs := make([]interface{}, 0, len(responses))
		for _, response := range responses {
			responseDocs = append(responseDocs, response)
		}
		if _, err := db.EventResponsesCollection.InsertMany(ctx, responseDocs); err != nil {
			t.Fatalf("insert event responses: %v", err)
		}
	}

	t.Cleanup(func() {
		if len(userIds) > 0 {
			_, _ = db.UsersCollection.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": userIds}})
		}
		_, _ = db.EventResponsesCollection.DeleteMany(ctx, bson.M{"eventId": event.Id})
		_, _ = db.EventsCollection.DeleteOne(ctx, bson.M{"_id": event.Id})
	})
}

func decodeJSONBody[T any](t *testing.T, recorder *httptest.ResponseRecorder) T {
	t.Helper()

	var payload T
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response body: %v", err)
	}

	return payload
}

func TestGetEventFiltersUnnamedGuestResponses(t *testing.T) {
	router := newEventsReadFiltersTestRouter()

	signedInUserId := primitive.NewObjectID()
	eventId := primitive.NewObjectID()
	shortId := "flt01"
	blindAvailabilityDisabled := utils.FalsePtr()
	collectEmailsDisabled := utils.FalsePtr()
	isSignUpForm := utils.TruePtr()

	event := models.Event{
		Id:                       eventId,
		ShortId:                  &shortId,
		Name:                     "Guest filter event",
		Type:                     models.SPECIFIC_DATES,
		BlindAvailabilityEnabled: blindAvailabilityDisabled,
		CollectEmails:            collectEmailsDisabled,
		IsSignUpForm:             isSignUpForm,
		SignUpResponses: map[string]*models.SignUpResponse{
			"valid-guest-signup":      {Name: "Sign Up Guest", Email: "guest@example.com"},
			"blank-guest-signup":      {Name: "", Email: "blank@example.com"},
			"whitespace-guest-signup": {Name: "   ", Email: "space@example.com"},
			signedInUserId.Hex():      {UserId: signedInUserId},
		},
	}

	responses := []models.EventResponse{
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "Visible Guest",
			Response: &models.Response{
				Name:         "Visible Guest",
				Availability: []primitive.DateTime{},
				IfNeeded:     []primitive.DateTime{},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "blank-guest-response",
			Response: &models.Response{
				Name:         "",
				GuestId:      generateOpaqueGuestCredential(12),
				Availability: []primitive.DateTime{},
				IfNeeded:     []primitive.DateTime{},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "whitespace-guest-response",
			Response: &models.Response{
				Name:         "   ",
				GuestId:      generateOpaqueGuestCredential(12),
				Availability: []primitive.DateTime{},
				IfNeeded:     []primitive.DateTime{},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  signedInUserId.Hex(),
			Response: &models.Response{
				UserId:       signedInUserId,
				Availability: []primitive.DateTime{},
				IfNeeded:     []primitive.DateTime{},
			},
		},
	}

	users := []models.User{
		{
			Id:        signedInUserId,
			FirstName: "Signed In",
			Email:     "signed-in@example.com",
		},
	}

	seedEventReadFiltersTestData(t, event, responses, users)

	request := httptest.NewRequest(http.MethodGet, "/api/events/"+eventId.Hex(), nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	responseEvent := decodeJSONBody[models.Event](t, recorder)

	if _, exists := responseEvent.ResponsesMap["Visible Guest"]; !exists {
		t.Fatal("expected valid named guest response to remain in event payload")
	}
	if _, exists := responseEvent.ResponsesMap["blank-guest-response"]; exists {
		t.Fatal("expected blank-named guest response to be omitted from event payload")
	}
	if _, exists := responseEvent.ResponsesMap["whitespace-guest-response"]; exists {
		t.Fatal("expected whitespace-only guest response to be omitted from event payload")
	}
	if _, exists := responseEvent.ResponsesMap[signedInUserId.Hex()]; !exists {
		t.Fatal("expected signed-in user response to remain in event payload")
	}

	if _, exists := responseEvent.SignUpResponses["valid-guest-signup"]; !exists {
		t.Fatal("expected valid guest sign-up response to remain in event payload")
	}
	if _, exists := responseEvent.SignUpResponses["blank-guest-signup"]; exists {
		t.Fatal("expected blank-named guest sign-up response to be omitted from event payload")
	}
	if _, exists := responseEvent.SignUpResponses["whitespace-guest-signup"]; exists {
		t.Fatal("expected whitespace-only guest sign-up response to be omitted from event payload")
	}
	if _, exists := responseEvent.SignUpResponses[signedInUserId.Hex()]; !exists {
		t.Fatal("expected signed-in sign-up response to remain in event payload")
	}
}

func TestGetResponsesFiltersUnnamedGuestResponses(t *testing.T) {
	router := newEventsReadFiltersTestRouter()

	signedInUserId := primitive.NewObjectID()
	eventId := primitive.NewObjectID()
	shortId := "flt02"
	blindAvailabilityDisabled := utils.FalsePtr()
	collectEmailsDisabled := utils.FalsePtr()
	insideWindow := primitive.NewDateTimeFromTime(time.Date(2026, 5, 27, 10, 0, 0, 0, time.UTC))
	outsideWindow := primitive.NewDateTimeFromTime(time.Date(2026, 5, 27, 18, 0, 0, 0, time.UTC))
	windowStart := "2026-05-27T09:00:00Z"
	windowEnd := "2026-05-27T11:00:00Z"

	event := models.Event{
		Id:                       eventId,
		ShortId:                  &shortId,
		Name:                     "Response filter event",
		Type:                     models.SPECIFIC_DATES,
		BlindAvailabilityEnabled: blindAvailabilityDisabled,
		CollectEmails:            collectEmailsDisabled,
		SignUpResponses:          map[string]*models.SignUpResponse{},
	}

	responses := []models.EventResponse{
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "Visible Guest",
			Response: &models.Response{
				Name:         "Visible Guest",
				Availability: []primitive.DateTime{insideWindow, outsideWindow},
				IfNeeded:     []primitive.DateTime{insideWindow, outsideWindow},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "blank-guest-response",
			Response: &models.Response{
				Name:               "",
				GuestId:            generateOpaqueGuestCredential(12),
				GuestOwnershipMode: guestOwnershipModeToken,
				Availability:       []primitive.DateTime{insideWindow},
				IfNeeded:           []primitive.DateTime{insideWindow},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "whitespace-guest-response",
			Response: &models.Response{
				Name:         "   ",
				Availability: []primitive.DateTime{insideWindow},
				IfNeeded:     []primitive.DateTime{insideWindow},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  signedInUserId.Hex(),
			Response: &models.Response{
				UserId:       signedInUserId,
				Availability: []primitive.DateTime{insideWindow},
				IfNeeded:     []primitive.DateTime{insideWindow},
			},
		},
	}

	users := []models.User{
		{
			Id:        signedInUserId,
			FirstName: "Signed In",
			Email:     "signed-in@example.com",
		},
	}

	seedEventReadFiltersTestData(t, event, responses, users)

	request := httptest.NewRequest(http.MethodGet, "/api/events/"+eventId.Hex()+"/responses?timeMin="+windowStart+"&timeMax="+windowEnd, nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	responsesMap := decodeJSONBody[map[string]models.Response](t, recorder)

	guestResponse, exists := responsesMap["Visible Guest"]
	if !exists {
		t.Fatal("expected valid named guest response to remain in filtered responses payload")
	}
	if len(guestResponse.Availability) != 1 || guestResponse.Availability[0] != insideWindow {
		t.Fatal("expected guest availability to be subset to the requested time range")
	}
	if len(guestResponse.IfNeeded) != 1 || guestResponse.IfNeeded[0] != insideWindow {
		t.Fatal("expected guest if-needed availability to be subset to the requested time range")
	}
	for lookupKey := range responsesMap {
		if lookupKey == signedInUserId.Hex() || lookupKey == "Visible Guest" {
			continue
		}
		t.Fatalf("expected unnamed guest responses to be omitted from filtered responses payload, found unexpected key %q", lookupKey)
	}
	if len(responsesMap) != 2 {
		t.Fatalf("expected only visible guest and signed-in user responses to remain, got %d entries", len(responsesMap))
	}
	if _, exists := responsesMap[signedInUserId.Hex()]; !exists {
		t.Fatal("expected signed-in user response to remain in filtered responses payload")
	}
}

func TestGetResponsesBlindAvailabilityUsesFilteredGuestResponseMap(t *testing.T) {
	router := newEventsReadFiltersTestRouter()

	eventId := primitive.NewObjectID()
	shortId := "flt03"
	blindAvailabilityEnabled := utils.TruePtr()
	collectEmailsDisabled := utils.FalsePtr()
	insideWindow := primitive.NewDateTimeFromTime(time.Date(2026, 5, 27, 10, 0, 0, 0, time.UTC))
	windowStart := "2026-05-27T09:00:00Z"
	windowEnd := "2026-05-27T11:00:00Z"

	event := models.Event{
		Id:                       eventId,
		ShortId:                  &shortId,
		Name:                     "Blind response filter event",
		Type:                     models.SPECIFIC_DATES,
		BlindAvailabilityEnabled: blindAvailabilityEnabled,
		CollectEmails:            collectEmailsDisabled,
		SignUpResponses:          map[string]*models.SignUpResponse{},
	}

	responses := []models.EventResponse{
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "stale-valid-guest-key",
			Response: &models.Response{
				Name:               "Visible Guest",
				GuestId:            generateOpaqueGuestCredential(12),
				GuestOwnershipMode: guestOwnershipModeToken,
				Availability:       []primitive.DateTime{insideWindow},
				IfNeeded:           []primitive.DateTime{insideWindow},
			},
		},
		{
			Id:      primitive.NewObjectID(),
			EventId: eventId,
			UserId:  "stale-invalid-guest-key",
			Response: &models.Response{
				Name:               "   ",
				GuestId:            generateOpaqueGuestCredential(12),
				GuestOwnershipMode: guestOwnershipModeToken,
				Availability:       []primitive.DateTime{insideWindow},
				IfNeeded:           []primitive.DateTime{insideWindow},
			},
		},
	}

	seedEventReadFiltersTestData(t, event, responses, nil)

	validGuestId := responses[0].Response.GuestId
	invalidGuestId := responses[1].Response.GuestId

	validRequest := httptest.NewRequest(http.MethodGet, "/api/events/"+eventId.Hex()+"/responses?timeMin="+windowStart+"&timeMax="+windowEnd+"&guestId="+validGuestId, nil)
	validRecorder := httptest.NewRecorder()
	router.ServeHTTP(validRecorder, validRequest)

	if validRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 for valid guest blind-availability request, got %d: %s", validRecorder.Code, validRecorder.Body.String())
	}

	validResponses := decodeJSONBody[map[string]models.Response](t, validRecorder)
	if len(validResponses) != 1 {
		t.Fatalf("expected exactly one visible response for valid guest blind-availability request, got %d", len(validResponses))
	}
	if _, exists := validResponses[validGuestId]; !exists {
		t.Fatal("expected valid guest blind-availability request to keep the requested guest response")
	}

	invalidRequest := httptest.NewRequest(http.MethodGet, "/api/events/"+eventId.Hex()+"/responses?timeMin="+windowStart+"&timeMax="+windowEnd+"&guestId="+invalidGuestId, nil)
	invalidRecorder := httptest.NewRecorder()
	router.ServeHTTP(invalidRecorder, invalidRequest)

	if invalidRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 for invalid guest blind-availability request, got %d: %s", invalidRecorder.Code, invalidRecorder.Body.String())
	}

	invalidResponses := decodeJSONBody[map[string]models.Response](t, invalidRecorder)
	if len(invalidResponses) != 0 {
		t.Fatalf("expected unnamed guest blind-availability request to return an empty map, got %d entries", len(invalidResponses))
	}
}
