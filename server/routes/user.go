/* The /user group contains all the routes to get all the information about the currently signed in user */
package routes

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/db"
	"schej.it/server/errs"
	"schej.it/server/logger"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/responses"
	"schej.it/server/services/auth"
	"schej.it/server/services/calendar"
	"schej.it/server/services/contacts"
	"schej.it/server/services/microsoftgraph"
	"schej.it/server/utils"
)

func InitUser(router *gin.RouterGroup) {
	userRouter := router.Group("/user")
	userRouter.Use(middleware.AuthRequired())

	userRouter.GET("/profile", getProfile)
	userRouter.PATCH("/name", updateName)
	userRouter.PATCH("/calendar-options", updateCalendarOptions)
	userRouter.GET("/events", getEvents)
	userRouter.POST("/events/:eventId/set-folder", setEventFolder)
	userRouter.GET("/calendars", getCalendars)
	userRouter.POST("/add-google-calendar-account", addGoogleCalendarAccount)
	userRouter.POST("/add-apple-calendar-account", addAppleCalendarAccount)
	userRouter.POST("/add-outlook-calendar-account", addOutlookCalendarAccount)
	userRouter.POST("/add-ics-calendar-account", addICSCalendarAccount)
	userRouter.DELETE("/remove-calendar-account", removeCalendarAccount)
	userRouter.POST("/toggle-calendar", toggleCalendar)
	userRouter.POST("/toggle-sub-calendar", toggleSubCalendar)
	userRouter.GET("/searchContacts", searchContacts)
	userRouter.DELETE("", deleteUser)
}

// @Summary Gets the user's profile
// @Tags user
// @Produce json
// @Success 200 {object} models.User "A user profile object"
// @Router /user/profile [get]
func getProfile(c *gin.Context) {
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	// Get number of events created this month
	eventsCreatedThisMonth := db.GetEventsCreatedThisMonth(user.Id)
	user.NumEventsCreated = eventsCreatedThisMonth

	db.UpdateDailyUserLog(user)

	c.JSON(http.StatusOK, user)
}

// @Summary Updates the user's name
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{firstName=string,lastName=string} true "Object containing the updated name"
// @Success 200
// @Router /user/name [patch]
func updateName(c *gin.Context) {
	payload := struct {
		FirstName string `json:"firstName" binding:"required"`
		LastName  string `json:"lastName" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	authUser := utils.GetAuthUser(c)

	_, err := db.UsersCollection.UpdateByID(context.Background(), authUser.Id, bson.M{
		"$set": bson.M{"firstName": payload.FirstName, "lastName": payload.LastName, "hasCustomName": true},
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Updates the user's calendar options
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{bufferTime=models.BufferTimeOptions,workingHours=models.WorkingHoursOptions} true "Object containing the updated options"
// @Success 200
// @Router /user/calendar-options [patch]
func updateCalendarOptions(c *gin.Context) {
	payload := struct {
		BufferTime   *models.BufferTimeOptions   `json:"bufferTime"`
		WorkingHours *models.WorkingHoursOptions `json:"workingHours"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	authUser := utils.GetAuthUser(c)

	// Set default values for calendar options if nil
	if authUser.CalendarOptions == nil {
		authUser.CalendarOptions = &models.CalendarOptions{
			BufferTime: models.BufferTimeOptions{
				Enabled: false,
				Time:    15,
			},
			WorkingHours: models.WorkingHoursOptions{
				Enabled:   false,
				StartTime: 9,
				EndTime:   17,
			},
		}
	}

	// Update calendar options
	if payload.BufferTime != nil {
		authUser.CalendarOptions.BufferTime = *payload.BufferTime
	}
	if payload.WorkingHours != nil {
		authUser.CalendarOptions.WorkingHours = *payload.WorkingHours
	}

	// Update database
	_, err := db.UsersCollection.UpdateByID(context.Background(), authUser.Id, bson.M{
		"$set": bson.M{"calendarOptions": authUser.CalendarOptions},
	})
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Gets all the user's events
// @Description Returns an array containing all the user's events
// @Tags user
// @Produce json
// @Success 200 {object} []models.Event
// @Router /user/events [get]
func getEvents(c *gin.Context) {
	user := utils.GetAuthUser(c)
	userId := user.Id

	// Get the events associated with the current user
	events := make([]models.Event, 0)
	opts := options.Find().SetSort(bson.M{"_id": -1})

	// Get all the event ids that the user has responded to
	cursor, err := db.EventResponsesCollection.Find(context.Background(), bson.M{"userId": userId.Hex()})
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer cursor.Close(context.Background())
	eventIds := make([]primitive.ObjectID, 0)
	for cursor.Next(context.Background()) {
		var eventResponse models.EventResponse
		if err := cursor.Decode(&eventResponse); err != nil {
			logger.StdErr.Panicln(err)
		}
		eventIds = append(eventIds, eventResponse.EventId)
	}

	// Get all the event ids that the user is an attendee of
	cursor, err = db.AttendeesCollection.Find(context.Background(), bson.M{"email": user.Email, "declined": false})
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer cursor.Close(context.Background())
	hasRespondedEventIds := make(models.Set[primitive.ObjectID])
	for cursor.Next(context.Background()) {
		var attendee models.Attendee
		if err := cursor.Decode(&attendee); err != nil {
			logger.StdErr.Panicln(err)
		}
		if utils.Contains(eventIds, attendee.EventId) {
			hasRespondedEventIds[attendee.EventId] = struct{}{}
		} else {
			eventIds = append(eventIds, attendee.EventId)
		}
	}

	cursor, err = db.EventsCollection.Find(
		context.Background(),
		bson.M{
			"$and": bson.A{
				bson.M{
					"$or": bson.A{
						bson.M{"_id": bson.M{"$in": eventIds}},
						bson.M{"ownerId": userId},
					},
				},
				bson.M{
					"$or": bson.A{
						bson.M{"isDeleted": bson.M{"$exists": false}},
						bson.M{"isDeleted": false},
					},
				},
			},
		},
		opts,
	)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	if err := cursor.All(context.Background(), &events); err != nil {
		logger.StdErr.Panicln(err)
	}

	for i, event := range events {
		// Set the hasResponded field for availability groups
		if event.Type == models.GROUP {
			if _, ok := hasRespondedEventIds[event.Id]; ok {
				events[i].HasResponded = utils.TruePtr()
			} else {
				events[i].HasResponded = utils.FalsePtr()
			}
		}
	}

	c.JSON(http.StatusOK, events)
}

// @Summary Sets the folder for the specified event
// @Tags user
// @Accept json
// @Produce json
// @Param eventId path string true "The ID of the event to set the folder for"
// @Param payload body object{folderId=string} true "The ID of the folder to set the event to"
// @Success 200
// @Router /user/events/{eventId}/set-folder [post]
func setEventFolder(c *gin.Context) {
	eventId, err := primitive.ObjectIDFromHex(c.Param("eventId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var body = struct {
		FolderId *string `json:"folderId"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session := sessions.Default(c)
	userIdString := session.Get("userId").(string)
	userId, err := primitive.ObjectIDFromHex(userIdString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var folderId *primitive.ObjectID
	if body.FolderId != nil {
		id, err := primitive.ObjectIDFromHex(*body.FolderId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID"})
			return
		}
		folderId = &id
	}

	err = db.SetEventFolder(eventId, folderId, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add event to folder"})
		return
	}

	c.Status(http.StatusOK)
}

// @Summary Gets the user's calendar events
// @Description Gets the user's calendar events between "timeMin" and "timeMax"
// @Tags user
// @Produce json
// @Param timeMin query string true "Lower bound for event's start time to filter by"
// @Param timeMax query string true "Upper bound for event's end time to filter by"
// @Param accounts query string false "Comma separated list of accounts to fetch calendar events from"
// @Success 200 {object} map[string]calendar.CalendarEventsWithError
// @Router /user/calendars [get]
func getCalendars(c *gin.Context) {
	// Bind query parameters
	payload := struct {
		TimeMin  time.Time `form:"timeMin" binding:"required"`
		TimeMax  time.Time `form:"timeMax" binding:"required"`
		Accounts string    `form:"accounts"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	var accounts []string
	if len(payload.Accounts) == 0 {
		accounts = make([]string, 0)
	} else {
		accounts = utils.ParseArrayQueryParam(payload.Accounts)
	}
	accountsSet := utils.ArrayToSet(accounts)
	user := utils.GetAuthUser(c)

	calendarEvents, editedCalendarAccounts := calendar.GetUsersCalendarEvents(user, accountsSet, payload.TimeMin, payload.TimeMax)

	if editedCalendarAccounts {
		db.UsersCollection.FindOneAndUpdate(
			context.Background(),
			bson.M{"_id": user.Id},
			bson.M{"$set": user},
		)
	}

	c.JSON(http.StatusOK, calendarEvents)
}

// @Summary Adds a new calendar account
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{code=string,scope=string} true "Object containing the Google authorization code and scope"
// @Success 200
// @Router /user/add-google-calendar-account [post]
func addGoogleCalendarAccount(c *gin.Context) {
	payload := struct {
		Code  string `json:"code" binding:"required"`
		Scope string `json:"scope" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	// Get tokens
	tokens := auth.GetTokensFromAuthCode(payload.Code, payload.Scope, utils.GetOrigin(c), models.GoogleCalendarType)

	// Get user info from JWT
	claims := utils.ParseJWT(tokens.IdToken)
	email, _ := claims.GetStr("email")
	picture, _ := claims.GetStr("picture")

	// Get access token expire time
	accessTokenExpireDate := utils.GetAccessTokenExpireDate(tokens.ExpiresIn)

	calendarAuth := &models.OAuth2CalendarAuth{
		AccessToken:           tokens.AccessToken,
		AccessTokenExpireDate: primitive.NewDateTimeFromTime(accessTokenExpireDate),
		RefreshToken:          tokens.RefreshToken,
	}

	addCalendarAccount(c, addCalendarAccountArgs{
		calendarType:       models.GoogleCalendarType,
		oAuth2CalendarAuth: calendarAuth,
		email:              email,
		picture:            picture,
	})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Adds an apple calendar account
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{email=string,password=string} true "Object containing the email and app password of the apple account"
// @Success 200
// @Router /user/add-apple-calendar-account [post]
func addAppleCalendarAccount(c *gin.Context) {
	payload := struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	encryptedPassword, err := utils.Encrypt(payload.Password)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	auth := &models.AppleCalendarAuth{
		Email:    payload.Email,
		Password: encryptedPassword,
	}

	// Check if the provided credentials are valid
	calendarProvider := calendar.AppleCalendar{
		AppleCalendarAuth: *auth,
	}
	_, err = calendarProvider.GetCalendarList()
	if err != nil {
		c.JSON(http.StatusUnauthorized, responses.Error{Error: errs.InvalidCredentials})
		return
	}

	addCalendarAccount(c, addCalendarAccountArgs{
		calendarType:      models.AppleCalendarType,
		appleCalendarAuth: auth,
		email:             payload.Email,
		picture:           "",
	})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Adds a new outlook calendar account
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{code=string,scope=string} true "Object containing the Outlook authorization code and scope"
// @Success 200
// @Router /user/add-outlook-calendar-account [post]
func addOutlookCalendarAccount(c *gin.Context) {
	payload := struct {
		Code  string `json:"code" binding:"required"`
		Scope string `json:"scope" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	// Get auth user
	authUser := utils.GetAuthUser(c)

	// Get tokens
	tokens := auth.GetTokensFromAuthCode(payload.Code, payload.Scope, utils.GetOrigin(c), models.OutlookCalendarType)

	// Get access token expire time
	accessTokenExpireDate := utils.GetAccessTokenExpireDate(tokens.ExpiresIn)

	// Construct calendarAuth object
	calendarAuth := &models.OAuth2CalendarAuth{
		AccessToken:           tokens.AccessToken,
		AccessTokenExpireDate: primitive.NewDateTimeFromTime(accessTokenExpireDate),
		RefreshToken:          tokens.RefreshToken,
		Scope:                 payload.Scope,
	}

	// Get user info
	userInfo := microsoftgraph.GetUserInfo(authUser, calendarAuth)

	addCalendarAccount(c, addCalendarAccountArgs{
		calendarType:       models.OutlookCalendarType,
		oAuth2CalendarAuth: calendarAuth,
		email:              userInfo.Email,
		picture:            "",
	})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Adds an ICS calendar account
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{feedUrl=string,label=string} true "Object containing the feed URL and label of the ICS calendar"
// @Success 200
// @Router /user/add-ics-calendar-account [post]
func addICSCalendarAccount(c *gin.Context) {
	payload := struct {
		FeedURL string `json:"feedUrl" binding:"required"`
		Label   string `json:"label" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	auth := &models.ICSCalendarAuth{
		FeedURL: payload.FeedURL,
		Label:   payload.Label,
	}

	// Check if the provided feed URL is reachable
	calendarProvider := calendar.ICSCalendar{
		ICSCalendarAuth: *auth,
	}
	_, err := calendarProvider.GetCalendarList()
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: "Invalid ICS feed URL"})
		return
	}

	addCalendarAccount(c, addCalendarAccountArgs{
		calendarType:    models.ICSCalendarType,
		icsCalendarAuth: auth,
		// ICS feeds don't have an email, so we use the label instead
		email:   payload.Label,
		picture: "",
	})

	c.JSON(http.StatusOK, gin.H{})
}

// Implements the shared functionality for adding a calendar account
type addCalendarAccountArgs struct {
	calendarType       models.CalendarType
	oAuth2CalendarAuth *models.OAuth2CalendarAuth
	appleCalendarAuth  *models.AppleCalendarAuth
	icsCalendarAuth    *models.ICSCalendarAuth
	email              string
	picture            string
}

func addCalendarAccount(c *gin.Context, args addCalendarAccountArgs) {
	// Get auth user
	authUser := utils.GetAuthUser(c)

	// Create calendar account object
	calendarAccount := models.CalendarAccount{
		CalendarType: args.calendarType,

		Email:   args.email,
		Picture: args.picture,
		Enabled: utils.TruePtr(), // Workaround to pass a boolean pointer
	}
	switch args.calendarType {
	case models.GoogleCalendarType:
		calendarAccount.OAuth2CalendarAuth = args.oAuth2CalendarAuth
	case models.OutlookCalendarType:
		calendarAccount.OAuth2CalendarAuth = args.oAuth2CalendarAuth
	case models.AppleCalendarType:
		calendarAccount.AppleCalendarAuth = args.appleCalendarAuth
	case models.ICSCalendarType:
		calendarAccount.ICSCalendarAuth = args.icsCalendarAuth
	}
	calendarAccountKey := utils.GetCalendarAccountKey(args.email, args.calendarType)

	// Set subcalendars map based on whether calendar account already exists
	if oldCalendarAccount, ok := authUser.CalendarAccounts[calendarAccountKey]; ok && oldCalendarAccount.SubCalendars != nil {
		calendarAccount.SubCalendars = oldCalendarAccount.SubCalendars
	} else {
		subCalendars, err := calendar.GetCalendarProvider(calendarAccount).GetCalendarList()
		if err == nil {
			calendarAccount.SubCalendars = &subCalendars
		}
	}

	// Set calendar account
	authUser.CalendarAccounts[calendarAccountKey] = calendarAccount

	// Perform mongo update
	db.UsersCollection.FindOneAndUpdate(
		context.Background(),
		bson.M{"_id": authUser.Id},
		bson.M{"$set": authUser},
	)
}

// @Summary Removes an existing calendar account
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{email=string,calendarType=models.CalendarType} true "Object containing the email + type of the calendar account to remove"
// @Success 200
// @Router /user/remove-calendar-account [delete]
func removeCalendarAccount(c *gin.Context) {
	payload := struct {
		Email        string              `json:"email" binding:"required"`
		CalendarType models.CalendarType `json:"calendarType" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	calendarAccountKey := utils.GetCalendarAccountKey(payload.Email, payload.CalendarType)

	authUser := utils.GetAuthUser(c)
	db.UsersCollection.UpdateByID(context.Background(), authUser.Id, bson.A{
		bson.M{"$set": bson.M{
			"calendarAccounts": bson.M{
				"$setField": bson.M{
					"field": calendarAccountKey,
					"input": "$$ROOT.calendarAccounts",
					"value": "$$REMOVE",
				},
			},
		}},
	})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Toggles whether the specified calendar is enabled or disabled for the user
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{calendarAccountKey=string,enabled=bool} true "Email of calendar account and whether to enable it"
// @Success 200
// @Router /user/toggle-calendar [post]
func toggleCalendar(c *gin.Context) {
	payload := struct {
		Email        string              `json:"email" binding:"required"`
		CalendarType models.CalendarType `json:"calendarType" binding:"required"`
		Enabled      *bool               `json:"enabled" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		logger.StdErr.Panicln(err)
		return
	}

	// Update enabled status for the specified account
	authUser := utils.GetAuthUser(c)
	calendarAccountKey := utils.GetCalendarAccountKey(payload.Email, payload.CalendarType)
	if account, ok := authUser.CalendarAccounts[calendarAccountKey]; ok {
		account.Enabled = payload.Enabled
		authUser.CalendarAccounts[calendarAccountKey] = account

		_, err := db.UsersCollection.UpdateOne(context.Background(), bson.M{
			"_id": authUser.Id,
		}, bson.M{
			"$set": authUser,
		})
		if err != nil {
			logger.StdErr.Panicln(err)
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Toggles whether the specified sub-calendar is enabled or disabled for the user
// @Tags user
// @Accept json
// @Produce json
// @Param payload body object{calendarAccountKey=string,subCalendarId=string,enabled=bool} true "Email of calendar account, the sub calendar id, and whether to enable it"
// @Success 200
// @Router /user/toggle-sub-calendar [post]
func toggleSubCalendar(c *gin.Context) {
	payload := struct {
		Email         string              `json:"email" binding:"required"`
		CalendarType  models.CalendarType `json:"calendarType" binding:"required"`
		SubCalendarId string              `json:"subCalendarId" binding:"required"`
		Enabled       *bool               `json:"enabled" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		logger.StdErr.Panicln(err)
		return
	}

	// Update enabled status for the specified sub calendar
	authUser := utils.GetAuthUser(c)
	calendarAccountKey := utils.GetCalendarAccountKey(payload.Email, payload.CalendarType)
	if account, ok := authUser.CalendarAccounts[calendarAccountKey]; ok {
		if subCalendar, ok := (*account.SubCalendars)[payload.SubCalendarId]; ok {
			subCalendar.Enabled = payload.Enabled
			(*account.SubCalendars)[payload.SubCalendarId] = subCalendar
			authUser.CalendarAccounts[calendarAccountKey] = account

			_, err := db.UsersCollection.UpdateOne(context.Background(), bson.M{
				"_id": authUser.Id,
			}, bson.M{
				"$set": authUser,
			})
			if err != nil {
				logger.StdErr.Panicln(err)
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Searches the user's contacts based on the given query
// @Tags user
// @Produce json
// @Param query query string true "Query to search for"
// @Success 200 {object} []models.User
// @Router /user/searchContacts [get]
func searchContacts(c *gin.Context) {
	// Bind query parameters
	payload := struct {
		Query string `form:"query"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	contacts, googleError := contacts.SearchContacts(user, payload.Query)
	if googleError != nil {
		c.JSON(googleError.Code, responses.Error{Error: *googleError})
		return
	}

	c.JSON(http.StatusOK, contacts)
}

// @Summary Deletes the currently signed in user
// @Tags user
// @Produce json
// @Success 200
// @Router /user [delete]
func deleteUser(c *gin.Context) {
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	_, err := db.UsersCollection.DeleteOne(context.Background(), bson.M{"_id": user.Id})
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	// Delete session
	session := sessions.Default(c)
	session.Delete("userId")
	session.Save()

	c.JSON(http.StatusOK, gin.H{})
}
