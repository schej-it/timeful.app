/* The /auth group contains all the routes to sign in and sign out */
package routes

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"schej.it/server/db"
	"schej.it/server/errs"
	"schej.it/server/logger"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/responses"
	"schej.it/server/services/auth"
	"schej.it/server/services/calendar"
	"schej.it/server/services/listmonk"
	"schej.it/server/services/microsoftgraph"
	"schej.it/server/utils"
)

func InitAuth(router *gin.RouterGroup) {
	authRouter := router.Group("/auth")

	authRouter.POST("/sign-in", signIn)
	authRouter.POST("/sign-in-mobile", signInMobile)
	authRouter.POST("/sign-out", signOut)
	authRouter.GET("/status", middleware.AuthRequired(), getStatus)

	authRouter.POST("/otp/check-email", checkEmail)
	authRouter.POST("/otp/send", sendOtp)
	authRouter.POST("/otp/verify", verifyOtp)
}

// @Summary Signs user in
// @Description Signs user in and sets the access token session variable
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body object{code=string,scope=string,calendarType=string,timezoneOffset=int} true "Object containing the Google authorization code, scope, calendar type, and the user's timezone offset"
// @Success 200
// @Router /auth/sign-in [post]
func signIn(c *gin.Context) {
	payload := struct {
		Code           string              `json:"code" binding:"required"`
		Scope          string              `json:"scope" binding:"required"`
		CalendarType   models.CalendarType `json:"calendarType" binding:"required"`
		TimezoneOffset *int                `json:"timezoneOffset" binding:"required"`
		EventsToLink   []string            `json:"eventsToLink"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	tokens := auth.GetTokensFromAuthCode(payload.Code, payload.Scope, utils.GetOrigin(c), payload.CalendarType)

	user := signInHelper(c, tokens, models.WEB, payload.CalendarType, *payload.TimezoneOffset)

	// Link events to user
	for _, eventIdString := range payload.EventsToLink {
		eventId, err := primitive.ObjectIDFromHex(eventIdString)
		if err == nil {
			db.EventsCollection.UpdateOne(context.Background(), bson.M{"_id": eventId, "ownerId": nil}, bson.M{"$set": bson.M{"ownerId": user.Id}})
		}
	}

	c.JSON(http.StatusOK, user)
}

// @Summary Signs user in from mobile
// @Description Signs user in and sets the access token session variable
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body object{timezoneOffset=int,accessToken=string,scope=string,idToken=string,expiresIn=int,refreshToken=string,tokenOrigin=string,calendarType=string} true "Object containing the Google authorization code, calendar type, and the user's timezone offset"
// @Success 200
// @Router /auth/sign-in-mobile [post]
func signInMobile(c *gin.Context) {
	payload := struct {
		AccessToken    string                 `json:"accessToken" binding:"required"`
		Scope          string                 `json:"scope" binding:"required"`
		IdToken        string                 `json:"idToken" binding:"required"`
		ExpiresIn      int                    `json:"expiresIn" binding:"required"`
		RefreshToken   string                 `json:"refreshToken" binding:"required"`
		TokenOrigin    models.TokenOriginType `json:"tokenOrigin" binding:"required"`
		CalendarType   models.CalendarType    `json:"calendarType" binding:"required"`
		TimezoneOffset int                    `json:"timezoneOffset" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	signInHelper(
		c,
		auth.TokenResponse{
			AccessToken:  payload.AccessToken,
			IdToken:      payload.IdToken,
			ExpiresIn:    payload.ExpiresIn,
			RefreshToken: payload.RefreshToken,
			Scope:        payload.Scope,
		},
		payload.TokenOrigin,
		payload.CalendarType,
		payload.TimezoneOffset,
	)

	c.JSON(http.StatusOK, gin.H{})
}

// Helper function to sign user in with the given parameters from the google oauth route
func signInHelper(c *gin.Context, token auth.TokenResponse, tokenOrigin models.TokenOriginType, calendarType models.CalendarType, timezoneOffset int) models.User {
	// Get access token expire time
	accessTokenExpireDate := utils.GetAccessTokenExpireDate(token.ExpiresIn)

	// Construct calendar auth object
	calendarAuth := models.OAuth2CalendarAuth{
		AccessToken:           token.AccessToken,
		AccessTokenExpireDate: primitive.NewDateTimeFromTime(accessTokenExpireDate),
		RefreshToken:          token.RefreshToken,
		Scope:                 token.Scope,
	}

	var email, firstName, lastName, picture string
	if calendarType == models.GoogleCalendarType {
		// Get user info from JWT
		claims := utils.ParseJWT(token.IdToken)
		email, _ = claims.GetStr("email")
		firstName, _ = claims.GetStr("given_name")
		lastName, _ = claims.GetStr("family_name")
		picture, _ = claims.GetStr("picture")
	} else if calendarType == models.OutlookCalendarType {
		// Get user info from microsoft graph
		userInfo := microsoftgraph.GetUserInfo(nil, &calendarAuth)
		email = userInfo.Email
		firstName = userInfo.FirstName
		lastName = userInfo.LastName
		picture = ""
	}

	primaryAccountKey := utils.GetCalendarAccountKey(email, calendarType)

	// Create user object to create new user or update existing user
	userData := models.User{
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Picture:   picture,

		PrimaryAccountKey: &primaryAccountKey,

		TimezoneOffset: timezoneOffset,
		TokenOrigin:    tokenOrigin,
	}

	calendarAccount := models.CalendarAccount{
		CalendarType:       calendarType,
		OAuth2CalendarAuth: &calendarAuth,

		Email:   email,
		Picture: picture,
		Enabled: utils.TruePtr(), // Workaround to pass a boolean pointer
	}
	calendarAccountKey := utils.GetCalendarAccountKey(email, calendarType)

	var userId primitive.ObjectID
	findResult := db.UsersCollection.FindOne(context.Background(), bson.M{"email": email})
	// If user doesn't exist, create a new user
	if findResult.Err() == mongo.ErrNoDocuments {
		// Fetch subcalendars
		subCalendars, err := calendar.GetCalendarProvider(calendarAccount).GetCalendarList()
		if err == nil {
			calendarAccount.SubCalendars = &subCalendars
		}

		// Set calendar accounts
		userData.CalendarAccounts = map[string]models.CalendarAccount{
			calendarAccountKey: calendarAccount,
		}

		// Create user
		res, err := db.UsersCollection.InsertOne(context.Background(), userData)
		if err != nil {
			logger.StdErr.Panicln(err)
		}

		userId = res.InsertedID.(primitive.ObjectID)

		// slackbot.SendTextMessage(fmt.Sprintf(":wave: %s %s (%s) has joined schej.it!", firstName, lastName, email))
	} else {
		var user models.User
		if err := findResult.Decode(&user); err != nil {
			logger.StdErr.Panicln(err)
		}
		userId = user.Id

		// If user has custom name, do not override first name and last name
		if user.HasCustomName != nil && *user.HasCustomName {
			userData.FirstName = ""
			userData.LastName = ""
		}

		// Set subcalendars map based on whether calendar account already exists
		if oldCalendarAccount, ok := user.CalendarAccounts[calendarAccountKey]; ok && oldCalendarAccount.SubCalendars != nil {
			calendarAccount.SubCalendars = oldCalendarAccount.SubCalendars
		} else {
			subCalendars, err := calendar.GetCalendarProvider(calendarAccount).GetCalendarList()
			if err == nil {
				calendarAccount.SubCalendars = &subCalendars
			}
		}

		// Set calendar account
		userData.CalendarAccounts = user.CalendarAccounts
		userData.CalendarAccounts[calendarAccountKey] = calendarAccount

		// Update user if exists
		_, err := db.UsersCollection.UpdateByID(
			context.Background(),
			userId,
			bson.M{"$set": userData},
		)
		if err != nil {
			logger.StdErr.Panicln(err)
		}
	}

	if exists, userId := listmonk.DoesUserExist(email); exists {
		listmonk.AddUserToListmonk(email, firstName, lastName, picture, userId, true)
	} else {
		listmonk.AddUserToListmonk(email, firstName, lastName, picture, nil, true)
	}

	// Set session variables
	session := sessions.Default(c)
	session.Set("userId", userId.Hex())
	session.Save()

	userData.Id = userId
	return userData
}

// @Summary Signs user out
// @Description Signs user out and deletes the session
// @Tags auth
// @Accept json
// @Produce json
// @Success 200
// @Router /auth/sign-out [post]
func signOut(c *gin.Context) {
	// Delete session
	session := sessions.Default(c)
	session.Delete("userId")
	session.Save()

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Gets whether the user is signed in or not
// @Description Returns a 401 error if user is not signed in, 200 if they are
// @Tags auth
// @Success 200
// @Failure 401 {object} responses.Error "Error object"
// @Router /auth/status [get]
func getStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{})
}

func generateOtpCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return fmt.Sprintf("%06d", n.Int64())
}

// @Summary Checks whether a user with the given email exists
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body object{email=string} true "Email to check"
// @Success 200
// @Router /auth/otp/check-email [post]
func checkEmail(c *gin.Context) {
	payload := struct {
		Email string `json:"email" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	email := strings.ToLower(strings.TrimSpace(payload.Email))
	isNewUser := db.GetUserByEmail(email) == nil

	c.JSON(http.StatusOK, gin.H{"isNewUser": isNewUser})
}

// @Summary Sends an OTP code to the given email
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body object{email=string} true "Email to send OTP to"
// @Success 200
// @Router /auth/otp/send [post]
func sendOtp(c *gin.Context) {
	payload := struct {
		Email string `json:"email" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	email := strings.ToLower(strings.TrimSpace(payload.Email))

	// Delete any existing OTP codes for this email
	db.OtpCodesCollection.DeleteMany(context.Background(), bson.M{"email": email})

	code := generateOtpCode()
	otpDoc := models.OtpCode{
		Email:     email,
		Code:      code,
		ExpiresAt: time.Now().Add(10 * time.Minute),
		Attempts:  0,
	}

	_, err := db.OtpCodesCollection.InsertOne(context.Background(), otpDoc)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	subject := "Your Timeful sign-in code"
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
<h2 style="color: #333;">Your sign-in code</h2>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1a73e8; margin: 24px 0;">%s</p>
<p style="color: #666;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
</div>`, code)

	utils.SendEmail(email, subject, body, "text/html")

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Verifies an OTP code and signs the user in
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body object{email=string,code=string,timezoneOffset=int} true "Email, OTP code, and timezone offset"
// @Success 200
// @Router /auth/otp/verify [post]
func verifyOtp(c *gin.Context) {
	payload := struct {
		Email          string `json:"email" binding:"required"`
		Code           string `json:"code" binding:"required"`
		TimezoneOffset *int   `json:"timezoneOffset" binding:"required"`
		FirstName      string `json:"firstName"`
		LastName       string `json:"lastName"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	email := strings.ToLower(strings.TrimSpace(payload.Email))

	// Find the OTP document
	var otpDoc models.OtpCode
	err := db.OtpCodesCollection.FindOne(context.Background(), bson.M{
		"email":     email,
		"expiresAt": bson.M{"$gt": time.Now()},
	}).Decode(&otpDoc)

	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.OtpExpired})
		return
	} else if err != nil {
		logger.StdErr.Panicln(err)
	}

	// Rate-limit: max 5 attempts per code
	if otpDoc.Attempts >= 5 {
		db.OtpCodesCollection.DeleteOne(context.Background(), bson.M{"_id": otpDoc.Id})
		c.JSON(http.StatusTooManyRequests, responses.Error{Error: errs.OtpTooManyAttempts})
		return
	}

	// Increment attempts
	db.OtpCodesCollection.UpdateByID(context.Background(), otpDoc.Id, bson.M{
		"$inc": bson.M{"attempts": 1},
	})

	if otpDoc.Code != payload.Code {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.OtpInvalidCode})
		return
	}

	// OTP verified — delete it
	db.OtpCodesCollection.DeleteOne(context.Background(), bson.M{"_id": otpDoc.Id})

	// Find or create user
	var userId primitive.ObjectID
	findResult := db.UsersCollection.FindOne(context.Background(), bson.M{"email": email})

	if findResult.Err() == mongo.ErrNoDocuments {
		firstName := strings.TrimSpace(payload.FirstName)
		lastName := strings.TrimSpace(payload.LastName)

		userData := models.User{
			Email:          email,
			FirstName:      firstName,
			LastName:       lastName,
			TimezoneOffset: *payload.TimezoneOffset,
			TokenOrigin:    models.WEB,
		}

		res, err := db.UsersCollection.InsertOne(context.Background(), userData)
		if err != nil {
			logger.StdErr.Panicln(err)
		}
		userId = res.InsertedID.(primitive.ObjectID)

		if exists, listmonkUserId := listmonk.DoesUserExist(email); exists {
			listmonk.AddUserToListmonk(email, firstName, lastName, "", listmonkUserId, true)
		} else {
			listmonk.AddUserToListmonk(email, firstName, lastName, "", nil, true)
		}
	} else {
		var user models.User
		if err := findResult.Decode(&user); err != nil {
			logger.StdErr.Panicln(err)
		}
		userId = user.Id
	}

	// Set session — same mechanism as OAuth sign-in
	session := sessions.Default(c)
	session.Set("userId", userId.Hex())
	session.Save()

	user := db.GetUserById(userId.Hex())
	c.JSON(http.StatusOK, user)
}
