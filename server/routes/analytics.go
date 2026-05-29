/* The /analytics group contains all the routes to track analytics */
package routes

import (
	"context"
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"schej.it/server/db"
	"schej.it/server/logger"
	"schej.it/server/models"
	"schej.it/server/slackbot"
)

// BasicAuth middleware for analytics routes
func AnalyticsBasicAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		analyticsUsername := os.Getenv("ANALYTICS_USERNAME")
		analyticsPassword := os.Getenv("ANALYTICS_PASSWORD")

		// Fail closed if credentials aren't configured. Otherwise empty env
		// vars combined with the old `user != "" || pass != ""` style check
		// would let a request with empty credentials authenticate, exposing
		// these admin endpoints (user lookup, manual upgrade/downgrade).
		if analyticsUsername == "" || analyticsPassword == "" {
			logger.StdErr.Println("ANALYTICS_USERNAME/ANALYTICS_PASSWORD not configured; refusing analytics request")
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Analytics auth not configured"})
			return
		}

		user, pass, hasAuth := c.Request.BasicAuth()

		// Constant-time comparison to avoid leaking the credentials via timing.
		userMatch := subtle.ConstantTimeCompare([]byte(user), []byte(analyticsUsername)) == 1
		passMatch := subtle.ConstantTimeCompare([]byte(pass), []byte(analyticsPassword)) == 1

		if !hasAuth || !userMatch || !passMatch {
			c.Header("WWW-Authenticate", `Basic realm="Restricted"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.Next()
	}
}

func InitAnalytics(router *gin.RouterGroup) {
	analyticsRouter := router.Group("/analytics")

	analyticsRouter.POST("/scanned-poster", scannedPoster)
	analyticsRouter.POST("/upgrade-dialog-viewed", upgradeDialogViewed)
	analyticsRouter.GET("/monthly-active-event-creators", AnalyticsBasicAuth(), getMonthlyActiveEventCreators)
	analyticsRouter.GET("/monthly-active-event-creators-with-more-than-x-events", AnalyticsBasicAuth(), getMonthlyActiveEventCreatorsWithMoreThanXEvents)
	analyticsRouter.POST("/upgrade-user", AnalyticsBasicAuth(), upgradeUser)
	analyticsRouter.POST("/downgrade-user", AnalyticsBasicAuth(), downgradeUser)
	analyticsRouter.GET("/user/:email", AnalyticsBasicAuth(), getUserByEmail)
}

// @Summary Notifies us when poster QR code has been scanned
// @Tags analytics
// @Accept json
// @Produce json
// @Param payload body object{url=string,location=models.Location} true "Object containing the location that poster was scanned from and the url that was scanned"
// @Success 200
// @Router /analytics/scanned-poster [post]
func scannedPoster(c *gin.Context) {
	payload := struct {
		Url      string           `json:"url" binding:"required"`
		Location *models.Location `json:"location"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	if payload.Location != nil {
		slackbot.SendTextMessage(
			fmt.Sprintf(":face_with_monocle: Poster was scanned :face_with_monocle:\n*Location:* %s, %s, %s\n*URL:* %s",
				payload.Location.City,
				payload.Location.State,
				payload.Location.CountryCode,
				payload.Url,
			),
		)
	} else {
		slackbot.SendTextMessage(
			fmt.Sprintf(":face_with_monocle: Poster was scanned :face_with_monocle:\n*URL:* %s", payload.Url),
		)
	}

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Notifies us when user has viewed the upgrade dialog
// @Tags analytics
// @Accept json
// @Produce json
// @Param payload body object{userId=string} true "Object containing the user id"
// @Success 200
// @Router /analytics/upgrade-dialog-viewed [post]
func upgradeDialogViewed(c *gin.Context) {
	payload := struct {
		UserId string `json:"userId" binding:"required"`
		Price  string `json:"price" binding:"required"`
		Type   string `json:"type" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	var message string
	user := db.GetUserById(payload.UserId)
	if user == nil {
		message = fmt.Sprintf(":eyes: %s viewed the upgrade dialog (%s), type: %s", payload.UserId, payload.Price, payload.Type)
	} else {
		message = fmt.Sprintf(":eyes: %s %s (%s) viewed the upgrade dialog (%s), type: %s", user.FirstName, user.LastName, user.Email, payload.Price, payload.Type)
	}

	slackbot.SendTextMessageWithType(
		message,
		slackbot.MONETIZATION,
	)

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Gets the daily count of monthly active event creators over a date range
// @Tags analytics
// @Accept json
// @Produce json
// @Param startDate query string true "Start date (YYYY-MM-DD) for the range"
// @Param endDate query string true "End date (YYYY-MM-DD) for the range"
// @Param timezoneOffset query integer true "Client's timezone offset in minutes from UTC (e.g., -420 for UTC-7)"
// @Success 200 {array} object{date=string,count=int}
// @Failure 400 {object} object{error=string} "Invalid date format, range, or timezone offset"
// @Failure 500 {object} object{error=string} "Internal server error"
// @Router /analytics/monthly-active-event-creators [get]
func getMonthlyActiveEventCreators(c *gin.Context) {
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	timezoneOffsetStr := c.Query("timezoneOffset") // Get timezone offset param

	if startDateStr == "" || endDateStr == "" || timezoneOffsetStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "startDate, endDate, and timezoneOffset query parameters are required"})
		return
	}

	// Parse timezone offset
	timezoneOffset, err := strconv.Atoi(timezoneOffsetStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timezoneOffset format. Must be an integer representing minutes."})
		return
	}
	// Convert offset minutes to a location (Go's time package uses seconds west of UTC)
	// Note: JS getTimezoneOffset() is positive for west, negative for east.
	// Go FixedZone expects seconds east of UTC. So, offset needs to be negated and converted to seconds.
	location := time.FixedZone("UserOffset", -timezoneOffset*60)

	layout := "2006-01-02" // YYYY-MM-DD
	startDate, err := time.Parse(layout, startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
		return
	}
	endDate, err := time.Parse(layout, endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endDate cannot be before startDate"})
		return
	}

	var results []int64

	// Loop through each day from startDate to endDate (inclusive)
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		// Set time to end of the day using the *client's timezone* location
		year, month, day := d.Date()
		currentDateEndOfDay := time.Date(year, month, day, 23, 59, 59, 0, location) // Use parsed location

		count, err := db.CountDistinctMonthlyActiveEventCreators(currentDateEndOfDay)
		if err != nil {
			// Log the error but continue if possible, or decide to fail the whole request
			fmt.Printf("Error fetching count for date %s: %v\n", d.Format(layout), err)
			// Depending on requirements, you might want to return partial results or a full error
			// For now, let's skip this day's count on error
			// Alternatively: c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get count for %s: %s", d.Format(layout), err.Error())}); return
			continue // Skip this date if there's an error
		}

		results = append(results, count)
	}

	c.JSON(http.StatusOK, results)
}

// @Summary Gets the daily count of monthly active event creators over a date range with more than x events
// @Tags analytics
// @Accept json
// @Produce json
// @Param startDate query string true "Start date (YYYY-MM-DD) for the range"
// @Param endDate query string true "End date (YYYY-MM-DD) for the range"
// @Param timezoneOffset query integer true "Client's timezone offset in minutes from UTC (e.g., -420 for UTC-7)"
// @Success 200 {array} object{date=string,count=int}
// @Failure 400 {object} object{error=string} "Invalid date format, range, or timezone offset"
// @Failure 500 {object} object{error=string} "Internal server error"
// @Router /analytics/monthly-active-event-creators-with-more-than-x-events [get]
func getMonthlyActiveEventCreatorsWithMoreThanXEvents(c *gin.Context) {
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	timezoneOffsetStr := c.Query("timezoneOffset") // Get timezone offset param
	xStr := c.Query("x")

	if startDateStr == "" || endDateStr == "" || timezoneOffsetStr == "" || xStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "startDate, endDate, timezoneOffset, and x query parameters are required"})
		return
	}

	x, err := strconv.Atoi(xStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid x format. Must be an integer."})
		return
	}

	// Parse timezone offset
	timezoneOffset, err := strconv.Atoi(timezoneOffsetStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timezoneOffset format. Must be an integer representing minutes."})
		return
	}
	// Convert offset minutes to a location (Go's time package uses seconds west of UTC)
	// Note: JS getTimezoneOffset() is positive for west, negative for east.
	// Go FixedZone expects seconds east of UTC. So, offset needs to be negated and converted to seconds.
	location := time.FixedZone("UserOffset", -timezoneOffset*60)

	layout := "2006-01-02" // YYYY-MM-DD
	startDate, err := time.Parse(layout, startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
		return
	}
	endDate, err := time.Parse(layout, endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endDate cannot be before startDate"})
		return
	}

	var results []int64

	// Loop through each day from startDate to endDate (inclusive)
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		// Set time to end of the day using the *client's timezone* location
		year, month, day := d.Date()
		currentDateEndOfDay := time.Date(year, month, day, 23, 59, 59, 0, location) // Use parsed location

		count, err := db.CountDistinctMonthlyActiveEventCreatorsWithMoreThanXEvents(currentDateEndOfDay, x)
		if err != nil {
			fmt.Printf("Error fetching count for date %s: %v\n", d.Format(layout), err)
			continue // Skip this date if there's an error
		}

		results = append(results, count)
	}

	c.JSON(http.StatusOK, results)
}

// @Summary Upgrades the specified user to Schej Premium
// @Tags analytics
// @Accept json
// @Produce json
// @Param payload body object{email=string} true "Object containing the user email"
// @Success 200
// @Router /analytics/upgrade-user [post]
func upgradeUser(c *gin.Context) {
	payload := struct {
		Email string `json:"email" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	user := db.GetUserByEmail(payload.Email)
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	stripeCustomerId := "premium"
	user.StripeCustomerId = &stripeCustomerId
	db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": user.Id}, bson.M{"$set": user})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Downgrades the specified user to Schej Free
// @Tags analytics
// @Accept json
// @Produce json
// @Param payload body object{email=string} true "Object containing the user email"
// @Success 200
// @Router /analytics/downgrade-user [post]
func downgradeUser(c *gin.Context) {
	payload := struct {
		Email string `json:"email" binding:"required"`
	}{}
	if err := c.BindJSON(&payload); err != nil {
		return
	}

	user := db.GetUserByEmail(payload.Email)
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": user.Id}, bson.M{"$unset": bson.M{"stripeCustomerId": ""}})

	c.JSON(http.StatusOK, gin.H{})
}

// @Summary Gets the user by email
// @Tags analytics
// @Accept json
// @Produce json
// @Param email path string true "User email"
// @Success 200 {object} models.User
// @Router /analytics/user/{email} [get]
func getUserByEmail(c *gin.Context) {
	email := c.Param("email")
	user := db.GetUserByEmail(email)
	c.JSON(http.StatusOK, user)
}
