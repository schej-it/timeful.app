/* The /events group contains all the routes to get and edit events */
package routes

import (
	"context"
	"encoding/json" //TODO: remove this before committing
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/errs"
	"schej.it/server/logger"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/responses"
	"schej.it/server/services/calendar"
	"schej.it/server/services/gcloud"
	"schej.it/server/services/listmonk"
	"schej.it/server/utils"
)

func InitEvents(router *gin.RouterGroup) {
	eventRouter := router.Group("/events")

	eventRouter.POST("", createEvent)
	eventRouter.PUT("/:eventId", editEvent)
	eventRouter.GET("/:eventId", getEvent)
	eventRouter.GET("/:eventId/responses", getResponses)
	eventRouter.POST("/:eventId/response", updateEventResponse)
	eventRouter.DELETE("/:eventId/response", deleteEventResponse)
	eventRouter.POST("/:eventId/rename-user", renameUser)
	eventRouter.POST("/:eventId/responded", userResponded)
	eventRouter.POST("/:eventId/decline", middleware.AuthRequired(), declineInvite)
	eventRouter.GET("/:eventId/calendar-availabilities", middleware.AuthRequired(), getCalendarAvailabilities)
	eventRouter.DELETE("/:eventId", middleware.AuthRequired(), deleteEvent)
	eventRouter.POST("/:eventId/duplicate", middleware.AuthRequired(), duplicateEvent)
	eventRouter.POST("/:eventId/archive", middleware.AuthRequired(), archiveEvent)
}

// @Summary Creates a new event
// @Tags events
// @Accept json
// @Produce json
// @Param payload body object{name=string,duration=float32,dates=[]string,type=models.EventType,isSignUpForm=bool,signUpBlocks=[]models.SignUpBlock,notificationsEnabled=bool,blindAvailabilityEnabled=bool,daysOnly=bool,remindees=[]string,sendEmailAfterXResponses=int,when2meetHref=string,timeIncrement=int,attendees=[]string} true "Object containing info about the event to create"
// @Success 201 {object} object{eventId=string}
// @Router /events [post]
func createEvent(c *gin.Context) {
	payload := struct {
		// Required parameters
		Name     string               `json:"name" binding:"required"`
		Duration *float32             `json:"duration" binding:"required"`
		Dates    []primitive.DateTime `json:"dates" binding:"required"`
		Type     models.EventType     `json:"type" binding:"required"`

		// Only for specific times for specific dates events
		HasSpecificTimes *bool                `json:"hasSpecificTimes"`
		Times            []primitive.DateTime `json:"times"`

		// PostHog ID for the event creator
		CreatorPosthogId *string `json:"creatorPosthogId"`

		// Only for sign up form events
		IsSignUpForm *bool                 `json:"isSignUpForm"`
		SignUpBlocks *[]models.SignUpBlock `json:"signUpBlocks"`

		// Only for events (not groups)
		StartOnMonday            *bool    `json:"startOnMonday"`
		NotificationsEnabled     *bool    `json:"notificationsEnabled"`
		BlindAvailabilityEnabled *bool    `json:"blindAvailabilityEnabled"`
		DaysOnly                 *bool    `json:"daysOnly"`
		Remindees                []string `json:"remindees"`
		SendEmailAfterXResponses *int     `json:"sendEmailAfterXResponses"`
		When2meetHref            *string  `json:"when2meetHref"`
		CollectEmails            *bool    `json:"collectEmails"`
		TimeIncrement            *int     `json:"timeIncrement"`

		// Only for availability groups
		Attendees []string `json:"attendees"`
	}{}
	if err := c.Bind(&payload); err != nil {
		fmt.Println(err)
		return
	}
	session := sessions.Default(c)

	// If user logged in, set owner id to their user id, otherwise set owner id to nil
	userIdInterface := session.Get("userId")
	userId, signedIn := userIdInterface.(string)
	var user *models.User
	var ownerId primitive.ObjectID
	if signedIn {
		ownerId = utils.StringToObjectID(userId)
		user = db.GetUserById(userId)
	} else {
		ownerId = primitive.NilObjectID
	}

	// Construct event object
	numResponses := 0
	event := models.Event{
		Id:                       primitive.NewObjectID(),
		OwnerId:                  ownerId,
		CreatorPosthogId:         payload.CreatorPosthogId,
		Name:                     payload.Name,
		Duration:                 payload.Duration,
		Dates:                    payload.Dates,
		HasSpecificTimes:         payload.HasSpecificTimes,
		Times:                    payload.Times,
		IsSignUpForm:             payload.IsSignUpForm,
		SignUpBlocks:             payload.SignUpBlocks,
		StartOnMonday:            payload.StartOnMonday,
		NotificationsEnabled:     payload.NotificationsEnabled,
		BlindAvailabilityEnabled: payload.BlindAvailabilityEnabled,
		DaysOnly:                 payload.DaysOnly,
		SendEmailAfterXResponses: payload.SendEmailAfterXResponses,
		When2meetHref:            payload.When2meetHref,
		CollectEmails:            payload.CollectEmails,
		TimeIncrement:            payload.TimeIncrement,
		Type:                     payload.Type,
		SignUpResponses:          make(map[string]*models.SignUpResponse),
		NumResponses:             &numResponses,
	}

	// Generate short id
	shortId := db.GenerateShortEventId(event.Id)
	event.ShortId = &shortId

	// Schedule reminder emails if remindees array is not empty
	if len(payload.Remindees) > 0 {
		// Determine owner name
		var ownerName string
		if signedIn {
			ownerName = user.FirstName
		} else {
			ownerName = "Somebody"
		}

		// Schedule email reminders for each of the remindees' emails
		remindees := make([]models.Remindee, 0)
		for _, email := range payload.Remindees {
			taskIds := gcloud.CreateEmailTask(email, ownerName, payload.Name, event.GetId())
			remindees = append(remindees, models.Remindee{
				Email:     email,
				TaskIds:   taskIds,
				Responded: utils.FalsePtr(),
			})
		}

		event.Remindees = &remindees
	}

	attendees := make([]models.Attendee, 0)
	if payload.Type == models.GROUP {

		if signedIn {
			// 	// Add event owner to group by default
			// 	enabledCalendars := make(map[string][]string)
			// 	for email, calendarAccount := range user.CalendarAccounts {
			// 		if utils.Coalesce(calendarAccount.Enabled) {
			// 			enabledCalendars[email] = make([]string, 0)
			// 			for calendarId, subCalendar := range utils.Coalesce(calendarAccount.SubCalendars) {
			// 				if utils.Coalesce(subCalendar.Enabled) {
			// 					enabledCalendars[email] = append(enabledCalendars[email], calendarId)
			// 				}
			// 			}
			// 		}
			// 	}
			// 	event.Responses[user.Id.Hex()] = &models.Response{
			// 		UserId:                  user.Id,
			// 		UseCalendarAvailability: utils.TruePtr(),
			// 		EnabledCalendars:        &enabledCalendars,
			// 	}

			// Add owner as attendee
			attendees = append(attendees, models.Attendee{Email: user.Email, Declined: utils.FalsePtr(), EventId: event.Id})
		}

		// Add attendees and send email
		if len(payload.Attendees) > 0 {
			// Determine owner name
			var ownerName string
			if signedIn {
				ownerName = user.FirstName
			} else {
				ownerName = "Somebody"
			}

			// Add attendees to attendees array and send invite emails
			availabilityGroupInviteEmailId := 9
			for _, email := range payload.Attendees {
				listmonk.SendEmailAddSubscriberIfNotExist(email, availabilityGroupInviteEmailId, bson.M{
					"ownerName": ownerName,
					"groupName": event.Name,
					"groupUrl":  fmt.Sprintf("%s/g/%s", utils.GetBaseUrl(), event.GetId()),
				}, false)
				attendees = append(attendees, models.Attendee{Email: email, Declined: utils.FalsePtr(), EventId: event.Id})
			}

		}

		for _, attendee := range attendees {
			db.AttendeesCollection.InsertOne(context.Background(), attendee)
		}
	}

	// Insert event
	result, err := db.EventsCollection.InsertOne(context.Background(), event)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	insertedId := result.InsertedID.(primitive.ObjectID).Hex()

	// Send slackbot message
	// var creator string
	if signedIn {
		// creator = fmt.Sprintf("%s %s (%s)", user.FirstName, user.LastName, user.Email)
		user.NumEventsCreated++
		db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": ownerId}, bson.M{"$set": user})
	} else {
		// creator = "Guest :face_with_open_eyes_and_hand_over_mouth:"
	}
	// slackbot.SendEventCreatedMessage(insertedId, creator, event, len(attendees))

	c.JSON(http.StatusCreated, gin.H{"eventId": insertedId, "shortId": event.ShortId})
}

// @Summary Edits an event based on its id
// @Tags events
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{name=string,description=string,duration=float32,dates=[]string,type=models.EventType,signUpBlocks=[]models.SignUpBlock,notificationsEnabled=bool,blindAvailabilityEnabled=bool,daysOnly=bool,remindees=[]string,sendEmailAfterXResponses=int,attendees=[]string} true "Object containing info about the event to update"
// @Success 200
// @Router /events/{eventId} [put]
func editEvent(c *gin.Context) {
	payload := struct {
		// Required parameters
		Name     string               `json:"name" binding:"required"`
		Duration *float32             `json:"duration" binding:"required"`
		Dates    []primitive.DateTime `json:"dates" binding:"required"`
		Type     models.EventType     `json:"type" binding:"required"`

		// Only for specific times for specific dates events
		HasSpecificTimes *bool                `json:"hasSpecificTimes"`
		Times            []primitive.DateTime `json:"times"`

		// For both events and groups
		Description *string `json:"description"`

		// Only for sign up form events
		SignUpBlocks *[]models.SignUpBlock `json:"signUpBlocks"`

		// Only for events (not groups)
		StartOnMonday            *bool    `json:"startOnMonday"`
		NotificationsEnabled     *bool    `json:"notificationsEnabled"`
		BlindAvailabilityEnabled *bool    `json:"blindAvailabilityEnabled"`
		DaysOnly                 *bool    `json:"daysOnly"`
		Remindees                []string `json:"remindees"`
		SendEmailAfterXResponses *int     `json:"sendEmailAfterXResponses"`
		CollectEmails            *bool    `json:"collectEmails"`

		// Only for availability groups
		Attendees []string `json:"attendees"`
	}{}
	if err := c.Bind(&payload); err != nil {
		logger.StdErr.Println(err)
		return
	}

	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// If user logged in, set owner id to their user id, otherwise set owner id to nil
	session := sessions.Default(c)
	userIdInterface := session.Get("userId")
	userId, signedIn := userIdInterface.(string)
	var ownerId primitive.ObjectID
	if signedIn {
		ownerId = utils.StringToObjectID(userId)
	} else {
		ownerId = primitive.NilObjectID
	}

	// If event has an owner id, check if user has permissions to edit event
	if event.OwnerId != primitive.NilObjectID {
		if event.OwnerId != ownerId {
			c.JSON(http.StatusForbidden, responses.Error{Error: errs.UserNotEventOwner})
			return
		}
	}

	// Update event
	event.Name = payload.Name
	event.Description = payload.Description
	event.Duration = payload.Duration
	event.Dates = payload.Dates
	event.Times = payload.Times
	event.HasSpecificTimes = payload.HasSpecificTimes
	event.SignUpBlocks = payload.SignUpBlocks
	event.StartOnMonday = payload.StartOnMonday
	event.NotificationsEnabled = payload.NotificationsEnabled
	event.BlindAvailabilityEnabled = payload.BlindAvailabilityEnabled
	event.DaysOnly = payload.DaysOnly
	event.SendEmailAfterXResponses = payload.SendEmailAfterXResponses
	event.CollectEmails = payload.CollectEmails
	event.Type = payload.Type

	// Update remindees
	if event.Type == models.DOW || event.Type == models.SPECIFIC_DATES {
		origRemindees := utils.Coalesce(event.Remindees)
		updatedRemindees := make([]models.Remindee, 0)
		added, removed, kept := utils.FindAddedRemovedKept(payload.Remindees, utils.Map(origRemindees, func(r models.Remindee) string { return r.Email }))

		// Determine owner name
		var ownerName string
		if event.OwnerId == primitive.NilObjectID {
			ownerName = "Somebody"
		} else {
			owner := db.GetUserById(event.OwnerId.Hex())
			ownerName = owner.FirstName
		}

		for _, keptEmail := range kept {
			updatedRemindees = append(updatedRemindees, origRemindees[keptEmail.Index])
		}

		for _, addedEmail := range added {
			// Schedule email tasks
			taskIds := gcloud.CreateEmailTask(addedEmail.Value, ownerName, event.Name, event.GetId())
			updatedRemindees = append(updatedRemindees, models.Remindee{
				Email:     addedEmail.Value,
				TaskIds:   taskIds,
				Responded: utils.FalsePtr(),
			})
		}

		for _, removedEmail := range removed {
			// Delete email tasks
			for _, taskId := range origRemindees[removedEmail.Index].TaskIds {
				gcloud.DeleteEmailTask(taskId)
			}
		}

		event.Remindees = &updatedRemindees
	}

	// Update attendees
	if event.Type == models.GROUP {
		origAttendees := db.GetAttendees(event.Id.Hex())
		added, removed, kept := utils.FindAddedRemovedKept(payload.Attendees, utils.Map(origAttendees, func(a models.Attendee) string { return a.Email }))

		// Determine owner name
		var ownerName string
		var owner *models.User
		if event.OwnerId != primitive.NilObjectID {
			owner = db.GetUserById(event.OwnerId.Hex())
			ownerName = owner.FirstName
		} else {
			ownerName = "Somebody"
		}

		if len(removed) > 0 {
			eventResponses := db.GetEventResponses(event.Id.Hex())

			// Remove user from responses map
			for _, removedEmail := range removed {
				// Only delete response if it isn't the owner of the group
				if removedEmail.Value != utils.Coalesce(owner).Email {
					removedUser := db.GetUserByEmail(removedEmail.Value)
					if removedUser != nil {
						// Remove response from array
						for i := range eventResponses {
							if eventResponses[i].UserId == removedUser.Id.Hex() {
								db.EventResponsesCollection.DeleteOne(context.Background(), bson.M{
									"_id": eventResponses[i].Id,
								})
								*event.NumResponses--
								break
							}
						}
					}

					// Remove attendee from attendees collection
					db.AttendeesCollection.DeleteOne(context.Background(), bson.M{
						"email":   removedEmail.Value,
						"eventId": event.Id,
					})
				}
			}
		}

		for _, addedEmail := range added {
			// Send invite email
			availabilityGroupInviteEmailId := 9
			listmonk.SendEmailAddSubscriberIfNotExist(addedEmail.Value, availabilityGroupInviteEmailId, bson.M{
				"ownerName": ownerName,
				"groupName": event.Name,
				"groupUrl":  fmt.Sprintf("%s/g/%s", utils.GetBaseUrl(), event.GetId()),
			}, false)
			db.AttendeesCollection.InsertOne(context.Background(), models.Attendee{
				Email:    addedEmail.Value,
				Declined: utils.FalsePtr(),
				EventId:  event.Id,
			})
		}

		// Send group update emails
		if len(added) > 0 {
			emails := utils.Map(added, func(a utils.ElementWithIndex[string]) string { return a.Value })
			addedAttendeeEmailId := 11

			for _, keptEmail := range kept {
				listmonk.SendEmailAddSubscriberIfNotExist(keptEmail.Value, addedAttendeeEmailId, bson.M{
					"ownerName": ownerName,
					"groupName": event.Name,
					"groupUrl":  fmt.Sprintf("%s/g/%s", utils.GetBaseUrl(), event.GetId()),
					"emails":    emails,
				}, false)
			}
		}
	}

	// Update event object
	_, err := db.EventsCollection.UpdateOne(
		context.Background(),
		bson.M{
			"_id": event.Id,
		},
		bson.M{
			"$set": event,
		},
	)

	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.Status(http.StatusOK)
}

// @Summary Gets an event based on its id
// @Tags events
// @Produce json
// @Param eventId path string true "Event ID"
// @Success 200 {object} models.Event
// @Router /events/{eventId} [get]
func getEvent(c *gin.Context) {
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)

	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}
	eventResponses := db.GetEventResponses(event.Id.Hex())

	// Convert to old format for backward compatibility
	utils.ConvertEventToOldFormat(event, eventResponses)

	// Convert responses to map format for JSON response
	responsesMap := getResponsesMap(eventResponses)

	// Populate user fields
	for userId, response := range responsesMap {
		user := db.GetUserById(userId)
		if user == nil {
			if len(response.Name) == 0 {
				// User was deleted
				delete(responsesMap, userId)
				continue
			} else {
				// User is guest
				userId = response.Name
				response.User = &models.User{
					FirstName: response.Name,
					Email:     response.Email,
				}
			}
		} else {
			response.User = user
			response.User.CalendarAccounts = nil
		}
		responsesMap[userId] = response

		// Remove availability arrays
		responsesMap[userId].Availability = nil
		responsesMap[userId].IfNeeded = nil
		responsesMap[userId].ManualAvailability = nil
	}

	// Populate sign up form fields
	for userId, response := range event.SignUpResponses {
		user := db.GetUserById(userId)
		if user == nil {
			if len(response.Name) == 0 {
				// User was deleted
				delete(event.SignUpResponses, userId)
				continue
			} else {
				// User is guest
				userId = response.Name
				response.User = &models.User{
					FirstName: response.Name,
					Email:     response.Email,
				}
			}
		} else {
			response.User = user
		}
		event.SignUpResponses[userId] = response
	}

	if event.Type == models.GROUP {
		attendees := db.GetAttendees(event.Id.Hex())
		event.Attendees = &attendees
	}

	// Update event.ResponsesMap to match the final responsesMap
	event.ResponsesMap = responsesMap

	// Apply privacy logic based on blindAvailabilityEnabled
	if !utils.Coalesce(event.BlindAvailabilityEnabled) {
		// Blind availability is NOT enabled - return response as-is
		// Log response body
		responseJSON, err := json.MarshalIndent(event, "", "  ")
		if err != nil {
			logger.StdErr.Printf("Failed to marshal event for logging: %v\n", err)
		}
		c.JSON(http.StatusOK, event)
		return
	}

	// Blind availability IS enabled - apply privacy filtering
	ownerSesh := event.OwnerId.Hex()
	session := sessions.Default(c)
	userIdInterface := session.Get("userId")
	var userSesh string
	if userIdInterface != nil {
		userSesh = userIdInterface.(string)
	}
	guestName := c.Query("guestName")

	var privatizedResponse map[string]interface{}
	var err error

	if userSesh != "" {
		// User session exists (user is logged in)
		if ownerSesh == userSesh {
			// User is the owner - return response as-is
			privatizedResponse, err = utils.PrivatizeEventResponse(event, []string{}, []utils.PartialOmission{})
		} else {
			// User is NOT the owner - privatize response
			privateFields := []string{"ownerId", "numResponses"}
			partialOmissions := []utils.PartialOmission{
				{
					FieldName: "responses",
					KeepKey:   userSesh,
				},
			}
			privatizedResponse, err = utils.PrivatizeEventResponse(event, privateFields, partialOmissions)
		}
	} else if guestName != "" {
		// Guest name query parameter exists
		privateFields := []string{"ownerId", "numResponses"}
		partialOmissions := []utils.PartialOmission{
			{
				FieldName: "responses",
				KeepKey:   guestName,
			},
		}
		privatizedResponse, err = utils.PrivatizeEventResponse(event, privateFields, partialOmissions)
	} else {
		// No session, no guest name - remove all private fields
		privateFields := []string{"ownerId", "numResponses", "responses", "remindees"}
		privatizedResponse, err = utils.PrivatizeEventResponse(event, privateFields, []utils.PartialOmission{})
	}

	if err != nil {
		logger.StdErr.Printf("Failed to privatize event response: %v\n", err)
		// Fall back to returning the original event if privatization fails
		c.JSON(http.StatusOK, event)
		return
	}

	// Log response body
	responseJSON, err := json.MarshalIndent(privatizedResponse, "", "  ")
	if err != nil {
		logger.StdErr.Printf("Failed to marshal privatized response for logging: %v\n", err)
	}

	// Return the privatized response
	c.JSON(http.StatusOK, privatizedResponse)
}

// @Summary Gets responses for an event, filtering availability to be within the date ranges
// @Tags events
// @Produce json
// @Param eventId path string true "Event ID"
// @Param timeMin query string true "Lower bound for start time to filter availability by"
// @Param timeMax query string true "Upper bound for end time to filter availability by"
// @Success 200 {object} map[string]models.Response
// @Router /events/{eventId}/responses [get]
func getResponses(c *gin.Context) {
	// Bind query parameters
	payload := struct {
		TimeMin time.Time `form:"timeMin" binding:"required"`
		TimeMax time.Time `form:"timeMax" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	// Fetch event
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// Convert to map format and filter availability
	eventResponses := db.GetEventResponses(event.Id.Hex())
	responsesMap := getResponsesMap(eventResponses)

	// Filter availability slice based on timeMin and timeMax
	for userId, response := range responsesMap {
		subsetAvailability := make([]primitive.DateTime, 0)
		for _, timestamp := range response.Availability {
			if timestamp.Time().Compare(payload.TimeMin) >= 0 && timestamp.Time().Compare(payload.TimeMax) <= 0 {
				subsetAvailability = append(subsetAvailability, timestamp)
			}
		}
		response.Availability = subsetAvailability

		subsetIfNeeded := make([]primitive.DateTime, 0)
		for _, timestamp := range response.IfNeeded {
			if timestamp.Time().Compare(payload.TimeMin) >= 0 && timestamp.Time().Compare(payload.TimeMax) <= 0 {
				subsetIfNeeded = append(subsetIfNeeded, timestamp)
			}
		}
		response.IfNeeded = subsetIfNeeded

		subsetManualAvailability := make(map[primitive.DateTime][]primitive.DateTime)
		for timestamp := range utils.Coalesce(response.ManualAvailability) {
			if timestamp.Time().Compare(payload.TimeMin) >= 0 && timestamp.Time().Compare(payload.TimeMax) <= 0 {
				subsetManualAvailability[timestamp] = (*response.ManualAvailability)[timestamp]
			}
		}
		response.ManualAvailability = &subsetManualAvailability
		responsesMap[userId] = response
	}

	c.JSON(http.StatusOK, responsesMap)
}

// @Summary Updates the current user's availability
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{availability=[]string,ifNeeded=[]string,guest=bool,name=string,useCalendarAvailability=bool,enabledCalendars=map[string][]string,manualAvailability=map[string][]string,calendarOptions=models.CalendarOptions,signUpBlockIds=[]string} true "Object containing info about the event response to update"
// @Success 200
// @Router /events/{eventId}/response [post]
func updateEventResponse(c *gin.Context) {
	payload := struct {
		Availability []primitive.DateTime `json:"availability"`
		IfNeeded     []primitive.DateTime `json:"ifNeeded"`

		// Guest information
		Guest *bool  `json:"guest" binding:"required"`
		Name  string `json:"name"`
		Email string `json:"email"`

		// Calendar availability variables for Availability Groups feature
		UseCalendarAvailability *bool                                        `json:"useCalendarAvailability"`
		EnabledCalendars        *map[string][]string                         `json:"enabledCalendars"`
		ManualAvailability      *map[primitive.DateTime][]primitive.DateTime `json:"manualAvailability"`
		CalendarOptions         *models.CalendarOptions                      `json:"calendarOptions"`

		// Sign up form variables
		SignUpBlockIds []primitive.ObjectID `json:"signUpBlockIds"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}
	session := sessions.Default(c)
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}
	eventResponses := db.GetEventResponses(event.Id.Hex())

	var userIdString string
	var userHasResponded bool
	if !utils.Coalesce(event.IsSignUpForm) {
		// Populate response differently if guest vs signed in user
		var response models.Response
		if *payload.Guest {
			userIdString = payload.Name

			response = models.Response{
				Name:         payload.Name,
				Email:        payload.Email,
				Availability: payload.Availability,
				IfNeeded:     payload.IfNeeded,
			}
		} else {
			userIdInterface := session.Get("userId")
			if userIdInterface == nil {
				c.JSON(http.StatusUnauthorized, responses.Error{Error: errs.NotSignedIn})
				c.Abort()
				return
			}
			userIdString = userIdInterface.(string)
			userId := utils.StringToObjectID(userIdString)

			response = models.Response{
				UserId:                  userId,
				Availability:            payload.Availability,
				IfNeeded:                payload.IfNeeded,
				UseCalendarAvailability: payload.UseCalendarAvailability,
				EnabledCalendars:        payload.EnabledCalendars,
				CalendarOptions:         payload.CalendarOptions,
			}

			if event.Type == models.GROUP {
				user := db.GetUserById(userIdString)

				// Set declined to false (in case user declined group in the past)
				if user != nil {
					db.AttendeesCollection.UpdateOne(context.Background(), bson.M{
						"email":   user.Email,
						"eventId": event.Id,
					}, bson.M{
						"$set": bson.M{
							"declined": false,
						},
					})
				}

				// Update manual availability
				_, existingResponse := findResponse(eventResponses, userIdString)
				if existingResponse != nil {
					response.ManualAvailability = existingResponse.ManualAvailability
				}
				if response.ManualAvailability == nil {
					manualAvailability := make(map[primitive.DateTime][]primitive.DateTime)
					response.ManualAvailability = &manualAvailability
				}

				// Replace availability on days that already exist in manual availability map
				for day := range utils.Coalesce(response.ManualAvailability) {
					for payloadDay, availableTimes := range utils.Coalesce(payload.ManualAvailability) {
						// Check if day is between start and end times of the payload day
						endTime := payloadDay.Time().Add(time.Duration(*event.Duration) * time.Hour)
						if day.Time().Compare(payloadDay.Time()) >= 0 && day.Time().Compare(endTime) <= 0 {
							// Replace availability with updated availability
							delete(*response.ManualAvailability, day)
							(*response.ManualAvailability)[payloadDay] = availableTimes
							delete(*payload.ManualAvailability, payloadDay)
							break
						}
					}

					// Break if no more items in manual availability
					if len(utils.Coalesce(payload.ManualAvailability)) == 0 {
						break
					}
				}

				// Add the rest of manual availability that was not replaced
				for day, availableTimes := range utils.Coalesce(payload.ManualAvailability) {
					(*response.ManualAvailability)[day] = availableTimes
				}
			}
		}

		// Check if user has responded to event before (edit response) or not (new response)
		idx, _ := findResponse(eventResponses, userIdString)
		userHasResponded = idx != -1

		// Update event responses
		if userHasResponded {
			db.EventResponsesCollection.UpdateOne(context.Background(), bson.M{
				"_id": eventResponses[idx].Id,
			}, bson.M{
				"$set": bson.M{
					"response": &response,
				},
			})
		} else {
			db.EventResponsesCollection.InsertOne(context.Background(), models.EventResponse{
				UserId:   userIdString,
				Response: &response,
				EventId:  event.Id,
			})
			*event.NumResponses++
		}
	} else {
		var response models.SignUpResponse
		var userIdString string
		// Populate response differently if guest vs signed in user
		if *payload.Guest {
			userIdString = payload.Name

			response = models.SignUpResponse{
				SignUpBlockIds: payload.SignUpBlockIds,
				Name:           payload.Name,
				Email:          payload.Email,
			}
		} else {
			userIdInterface := session.Get("userId")
			if userIdInterface == nil {
				c.JSON(http.StatusUnauthorized, responses.Error{Error: errs.NotSignedIn})
				c.Abort()
				return
			}
			userIdString = userIdInterface.(string)

			response = models.SignUpResponse{
				SignUpBlockIds: payload.SignUpBlockIds,
				UserId:         utils.StringToObjectID(userIdString),
			}
		}

		// Check if user has responded to event before (edit response) or not (new response)
		_, userHasResponded = event.SignUpResponses[userIdString]

		// Update event responses
		if event.SignUpResponses == nil {
			event.SignUpResponses = make(map[string]*models.SignUpResponse)
		}
		event.SignUpResponses[userIdString] = &response
	}

	// Send notification emails
	if (utils.Coalesce(event.NotificationsEnabled) || event.Type == models.GROUP) && !userHasResponded && userIdString != event.OwnerId.Hex() {
		// Send email asynchronously
		go func() {
			// Recover from panics
			defer func() {
				if err := recover(); err != nil {
					logger.StdErr.Println(err)
				}
			}()

			creator := db.GetUserById(event.OwnerId.Hex())
			if creator == nil {
				return
			}

			var respondentName string
			if *payload.Guest {
				respondentName = payload.Name
			} else {
				respondent := db.GetUserById(userIdString)
				respondentName = fmt.Sprintf("%s %s", respondent.FirstName, respondent.LastName)
			}

			if event.Type == models.GROUP {
				someoneRespondedEmailId := 13
				listmonk.SendEmail(creator.Email, someoneRespondedEmailId, bson.M{
					"groupName":      event.Name,
					"ownerName":      creator.FirstName,
					"respondentName": respondentName,
					"groupUrl":       fmt.Sprintf("%s/g/%s", utils.GetBaseUrl(), event.GetId()),
				})
			} else {
				someoneRespondedEmailId := 10
				listmonk.SendEmail(creator.Email, someoneRespondedEmailId, bson.M{
					"eventName":      event.Name,
					"ownerName":      creator.FirstName,
					"respondentName": respondentName,
					"eventUrl":       fmt.Sprintf("%s/e/%s", utils.GetBaseUrl(), event.GetId()),
				})
			}
		}()
	}

	// Send email after X responses
	sendEmailAfterXResponses := utils.Coalesce(event.SendEmailAfterXResponses)
	if sendEmailAfterXResponses > 0 && !userHasResponded && sendEmailAfterXResponses == len(eventResponses)+1 { // We add 1 because eventResponses is the old event responses before the current user is added
		// Set SendEmailAfterXResponses variable to -1 to prevent additional emails from being sent
		*event.SendEmailAfterXResponses = -1

		// Send email asynchronously
		go func() {
			// Recover from panics
			defer func() {
				if err := recover(); err != nil {
					logger.StdErr.Println(err)
				}
			}()

			creator := db.GetUserById(event.OwnerId.Hex())
			if creator == nil {
				return
			}

			sendEmailAfterXResponsesEmailId := 14
			listmonk.SendEmail(creator.Email, sendEmailAfterXResponsesEmailId, bson.M{
				"eventName":    event.Name,
				"ownerName":    creator.FirstName,
				"eventUrl":     fmt.Sprintf("%s/e/%s", utils.GetBaseUrl(), event.GetId()),
				"numResponses": len(eventResponses) + 1, // We add 1 because eventResponses is the old event responses before the current user is added
			})
		}()
	}

	// Update event in mongodb
	_, err := db.EventsCollection.UpdateByID(
		context.Background(),
		event.Id,
		bson.M{"$set": event},
	)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Delete the current user's availability
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{userId=string,guest=bool,name=string} true "Object containing info about the event response to delete"
// @Success 200
// @Router /events/{eventId}/response [delete]
func deleteEventResponse(c *gin.Context) {
	payload := struct {
		UserId string `json:"userId"`
		Guest  *bool  `json:"guest" binding:"required"`
		Name   string `json:"name"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}
	session := sessions.Default(c)
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}
	eventResponses := db.GetEventResponses(event.Id.Hex())

	if *payload.Guest {
		if utils.Coalesce(event.IsSignUpForm) {
			delete(event.SignUpResponses, payload.Name)
		} else {
			// Remove response from array
			for i := range eventResponses {
				if eventResponses[i].Response.Name == payload.Name {
					db.EventResponsesCollection.DeleteOne(context.Background(), bson.M{
						"_id": eventResponses[i].Id,
					})
					*event.NumResponses--
					break
				}
			}
		}
	} else {
		userIdInterface := session.Get("userId")
		if userIdInterface == nil {
			c.JSON(http.StatusUnauthorized, responses.Error{Error: errs.NotSignedIn})
			c.Abort()
			return
		}
		userIdString := userIdInterface.(string)

		// Don't allow user to delete availability of other users if they aren't the owner of the event
		if payload.UserId != userIdString && event.OwnerId.Hex() != userIdString {
			c.JSON(http.StatusForbidden, responses.Error{Error: errs.UserNotEventOwner})
			c.Abort()
			return
		}

		if utils.Coalesce(event.IsSignUpForm) {
			delete(event.SignUpResponses, payload.UserId)
		} else {
			// Remove response from array
			for i := range eventResponses {
				if eventResponses[i].UserId == payload.UserId {
					db.EventResponsesCollection.DeleteOne(context.Background(), bson.M{
						"_id": eventResponses[i].Id,
					})
					*event.NumResponses--
					break
				}
			}
		}

		// If this event is a Group, also make the attendee "leave the group" by setting "declined" to true
		if event.Type == models.GROUP {
			user := db.GetUserById(userIdString)
			if user != nil {
				db.AttendeesCollection.UpdateOne(context.Background(), bson.M{
					"email":   user.Email,
					"eventId": event.Id,
				}, bson.M{
					"$set": bson.M{
						"declined": true,
					},
				})
			}
		}
	}

	// Update responses in mongodb
	_, err := db.EventsCollection.UpdateByID(
		context.Background(),
		event.Id,
		bson.M{
			"$set": event,
		},
	)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Rename a guest response
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{oldName=string,newName=string} true "Object containing info about the guest response to rename"
// @Success 200
// @Router /events/{eventId}/rename-user [post]
func renameUser(c *gin.Context) {
	payload := struct {
		OldName string `json:"oldName"`
		NewName string `json:"newName"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// Check if old name is a guest response
	db.UpdateGuestResponseName(event.Id.Hex(), payload.OldName, payload.NewName)

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Mark the user as having responded to this event
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{email=string} true "Object containing the user's email"
// @Success 200
// @Router /events/{eventId}/responded [post]
func userResponded(c *gin.Context) {
	payload := struct {
		Email string `json:"email" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	// Fetch event
	eventId := c.Param("eventId")
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// Update responded boolean for the given email
	if event.Remindees == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.RemindeeEmailNotFound})
		return
	}
	index := utils.Find(*event.Remindees, func(r models.Remindee) bool {
		return r.Email == payload.Email
	})
	if index == -1 {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.RemindeeEmailNotFound})
		return
	}
	if *(*event.Remindees)[index].Responded {
		// If remindee has already responded, just return and don't update db
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	(*event.Remindees)[index].Responded = utils.TruePtr()

	// Delete the reminder email tasks
	for _, taskId := range (*event.Remindees)[index].TaskIds {
		gcloud.DeleteEmailTask(taskId)
	}

	// Update event in database
	db.EventsCollection.UpdateByID(context.Background(), event.Id, bson.M{
		"$set": event,
	})

	// Email owner of event if all remindees have responded
	everyoneResponded := true
	for _, remindee := range *event.Remindees {
		if !*remindee.Responded {
			everyoneResponded = false
			break
		}
	}
	if everyoneResponded {
		// Get owner
		owner := db.GetUserById(event.OwnerId.Hex())

		// Get event url
		baseUrl := utils.GetBaseUrl()
		eventUrl := fmt.Sprintf("%s/e/%s", baseUrl, eventId)

		// Send email
		everyoneRespondedEmailTemplateId := 8
		listmonk.SendEmail(owner.Email, everyoneRespondedEmailTemplateId, bson.M{
			"eventName": event.Name,
			"eventUrl":  eventUrl,
		})
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Decline the current user's invite to the event
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Success 200
// @Router /events/{eventId}/decline [post]
func declineInvite(c *gin.Context) {
	// Fetch event
	eventId := c.Param("eventId")
	event := db.GetEventById(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// Ensure that event is a group
	if event.Type != models.GROUP {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.EventNotGroup})
		return
	}

	// Get current user
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	// Check if user is in attendees array
	attendee := db.AttendeesCollection.FindOne(context.Background(), bson.M{
		"email":   user.Email,
		"eventId": event.Id,
	})
	if attendee == nil {
		// User not in attendees array
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.AttendeeEmailNotFound})
		return
	}

	// Decline invite
	db.AttendeesCollection.UpdateOne(context.Background(), bson.M{
		"email":   user.Email,
		"eventId": event.Id,
	}, bson.M{
		"$set": bson.M{
			"declined": true,
		},
	})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Return a map mapping user id to their calendar events that they have enabled for the given time range
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param timeMin query string true "Lower bound for event's start time to filter by"
// @Param timeMax query string true "Upper bound for event's end time to filter by"
// @Success 200 {object} map[string]map[string]calendar.CalendarEventsWithError
// @Router /events/{eventId}/calendar-availabilities [get]
func getCalendarAvailabilities(c *gin.Context) {
	// Bind query parameters
	payload := struct {
		TimeMin time.Time `form:"timeMin" binding:"required"`
		TimeMax time.Time `form:"timeMax" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	// Fetch event
	eventId := c.Param("eventId")
	event := db.GetEventById(eventId)
	if event == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.EventNotFound})
		return
	}

	// Ensure that event is a group
	if event.Type != models.GROUP {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.EventNotGroup})
		return
	}

	// Get calendar events for each response that has calendar availability enabled
	numCalendarEventsRequests := 0
	calendarEventsChan := make(chan struct {
		UserId string
		Events map[string]calendar.CalendarEventsWithError
	})

	eventResponses := db.GetEventResponses(event.Id.Hex())
	for _, eventResponse := range eventResponses {
		if utils.Coalesce(eventResponse.Response.UseCalendarAvailability) {
			user := db.GetUserById(eventResponse.UserId)
			if user != nil {
				numCalendarEventsRequests++

				// Construct enabled accounts set
				enabledAccounts := make([]string, 0)
				for calendarAccountKey := range utils.Coalesce(eventResponse.Response.EnabledCalendars) {
					enabledAccounts = append(enabledAccounts, calendarAccountKey)
				}

				// Fetch calendar events
				go func(userId string) {
					// Recover from panics
					defer func() {
						if err := recover(); err != nil {
							logger.StdErr.Println(err)
						}
					}()

					calendarEvents, _ := calendar.GetUsersCalendarEvents(user, utils.ArrayToSet(enabledAccounts), payload.TimeMin, payload.TimeMax)
					calendarEventsChan <- struct {
						UserId string
						Events map[string]calendar.CalendarEventsWithError
					}{
						UserId: userId,
						Events: calendarEvents,
					}
				}(eventResponse.UserId)
			}
		}
	}

	// Create a map mapping user id to the calendar events of that user
	userIdToCalendarEvents := make(map[string][]models.CalendarEvent)
	for i := 0; i < numCalendarEventsRequests; i++ {
		calendarEvents := <-calendarEventsChan
		userIdToCalendarEvents[calendarEvents.UserId] = make([]models.CalendarEvent, 0)
		for _, events := range calendarEvents.Events {
			userIdToCalendarEvents[calendarEvents.UserId] = append(userIdToCalendarEvents[calendarEvents.UserId], events.CalendarEvents...)
		}
	}

	// Filter and format calendar events
	authUser := utils.GetAuthUser(c)
	for userId, calendarEvents := range userIdToCalendarEvents {
		// Find the corresponding response
		_, eventResponse := findResponse(eventResponses, userId)
		if eventResponse == nil {
			continue
		}

		// Construct enabled calendar ids set
		enabledCalendarIdsArr := make([]string, 0)
		for _, calendarIds := range utils.Coalesce(eventResponse.EnabledCalendars) {
			enabledCalendarIdsArr = append(enabledCalendarIdsArr, calendarIds...)
		}
		enabledCalendarIds := utils.ArrayToSet(enabledCalendarIdsArr)

		// Update calendar events
		updatedCalendarEvents := make([]models.CalendarEvent, 0)
		for _, calendarEvent := range calendarEvents {
			// Get rid of events on sub calendars that aren't enabled
			if _, ok := enabledCalendarIds[calendarEvent.CalendarId]; !ok {
				continue
			}

			// Redact event names of other users
			if authUser.Id.Hex() != userId {
				calendarEvent.Summary = "BUSY"
			}

			updatedCalendarEvents = append(updatedCalendarEvents, calendarEvent)
		}
		userIdToCalendarEvents[userId] = updatedCalendarEvents
	}

	c.JSON(http.StatusOK, userIdToCalendarEvents)
}

// @Summary Deletes an event based on its id
// @Tags events
// @Produce json
// @Param eventId path string true "Event ID"
// @Success 200
// @Router /events/{eventId} [delete]
func deleteEvent(c *gin.Context) {
	eventId := c.Param("eventId")

	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		c.Status(http.StatusBadRequest)
		return
	}

	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	// Check if the current user responded
	eventResponses := db.GetEventResponses(eventId)
	hasCurrentUserResponded := false
	for _, resp := range eventResponses {
		if resp.UserId == user.Id.Hex() {
			hasCurrentUserResponded = true
			break
		}
	}
	hasResponses := len(eventResponses) > 0
	if hasCurrentUserResponded {
		// Only set hasResponses to true if there are responses other than the current user's
		hasResponses = len(eventResponses) > 1
	}

	var event models.Event

	if hasResponses {
		// If event has responses, just set isDeleted flag
		result := db.EventsCollection.FindOneAndUpdate(context.Background(), bson.M{
			"_id":     objectId,
			"ownerId": user.Id,
		}, bson.M{
			"$set": bson.M{
				"isDeleted": true,
			},
		})
		err = result.Decode(&event)
		if err != nil {
			logger.StdErr.Panicln(err)
		}
	} else {
		// If event has no responses, actually delete the event object
		result := db.EventsCollection.FindOneAndDelete(context.Background(), bson.M{
			"_id":     objectId,
			"ownerId": user.Id,
		})
		err = result.Decode(&event)
		if err != nil {
			logger.StdErr.Panicln(err)
		}

		// Delete folder associations
		_, err = db.FolderEventsCollection.DeleteMany(context.Background(), bson.M{
			"eventId": objectId,
		})
		if err != nil {
			logger.StdErr.Panicln(err)
		}
	}

	// Delete gcloud tasks
	if event.Remindees != nil {
		for _, remindee := range *event.Remindees {
			// Delete email tasks
			for _, taskId := range remindee.TaskIds {
				gcloud.DeleteEmailTask(taskId)
			}
		}
	}

	c.Status(http.StatusOK)
}

// @Summary Duplicate event
// @Tags events
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{eventName=string,copyAvailability=bool} true "Object containing options for the duplicated event"
// @Success 200
// @Router /events/{eventId}/duplicate [post]
func duplicateEvent(c *gin.Context) {
	payload := struct {
		EventName        string `json:"eventName" binding:"required"`
		CopyAvailability *bool  `json:"copyAvailability" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	eventId := c.Param("eventId")
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	// Get event
	event := db.GetEventByEitherId(eventId)
	if event == nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// Make sure user has permission to duplicate this event
	if event.OwnerId != user.Id {
		c.Status(http.StatusForbidden)
		return
	}

	// Update event
	event.Id = primitive.NewObjectID()
	event.Name = payload.EventName
	numResponses := 0
	event.NumResponses = &numResponses
	if *payload.CopyAvailability {
		eventResponses := db.GetEventResponses(eventId)
		for _, eventResponse := range eventResponses {
			eventResponse.Id = primitive.NewObjectID()
			eventResponse.EventId = event.Id
			_, err := db.EventResponsesCollection.InsertOne(context.Background(), eventResponse)
			if err != nil {
				logger.StdErr.Panicln(err)
			}
			*event.NumResponses++
		}
	}

	// Generate short id
	shortId := db.GenerateShortEventId(event.Id)
	event.ShortId = &shortId

	// Insert new event
	result, err := db.EventsCollection.InsertOne(context.Background(), event)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	insertedId := result.InsertedID.(primitive.ObjectID).Hex()
	c.JSON(http.StatusCreated, gin.H{"eventId": insertedId, "shortId": shortId})
}

// @Summary Archive an event
// @Tags events
// @Accept json
// @Produce json
// @Param eventId path string true "Event ID"
// @Param payload body object{archive=bool} true "Archive status"
// @Success 200
// @Router /events/{eventId}/archive [post]
func archiveEvent(c *gin.Context) {
	payload := struct {
		Archive *bool `json:"archive" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	eventId := c.Param("eventId")

	objectId, err := primitive.ObjectIDFromHex(eventId)
	if err != nil {
		// eventId is malformatted
		c.Status(http.StatusBadRequest)
		return
	}

	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	result := db.EventsCollection.FindOneAndUpdate(context.Background(), bson.M{
		"_id":     objectId,
		"ownerId": user.Id,
	}, bson.M{
		"$set": bson.M{
			"isArchived": payload.Archive,
		},
	})
	var event models.Event
	err = result.Decode(&event)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.Status(http.StatusOK)
}

// Helper function to find a response by userId
func findResponse(responses []models.EventResponse, userId string) (int, *models.Response) {
	for i, resp := range responses {
		if resp.UserId == userId {
			return i, resp.Response
		}
	}
	return -1, nil
}

// Helper function to get all responses as a map (for backward compatibility)
func getResponsesMap(responses []models.EventResponse) map[string]*models.Response {
	result := make(map[string]*models.Response)
	for _, resp := range responses {
		result[resp.UserId] = resp.Response
	}
	return result
}
