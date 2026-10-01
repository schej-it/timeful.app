package routes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/logger"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/services/polar"
	"schej.it/server/slackbot"
	"schej.it/server/utils"
)

func InitPolar(router *gin.RouterGroup) {
	polarRouter := router.Group("/polar")

	polarRouter.GET("/price", getPolarPrice)
	polarRouter.POST("/create-checkout-session", middleware.AuthRequired(), createPolarCheckoutSession)
	polarRouter.POST("/fulfill-checkout", fulfillPolarCheckout)
	polarRouter.POST("/webhook", polarWebhook)
	polarRouter.GET("/billing-portal", middleware.AuthRequired(), getPolarBillingPortalUrl)
}

// Maps each plan key returned by /polar/price to the env var holding its Polar product ID
var polarPlanProductEnvVars = map[string]string{
	"lifetime":        "POLAR_LIFETIME_PRODUCT_ID",
	"monthly":         "POLAR_MONTHLY_PRODUCT_ID",
	"yearly":          "POLAR_YEARLY_PRODUCT_ID",
	"lifetimeStudent": "POLAR_LIFETIME_STUDENT_PRODUCT_ID",
	"monthlyStudent":  "POLAR_MONTHLY_STUDENT_PRODUCT_ID",
	"yearlyStudent":   "POLAR_YEARLY_STUDENT_PRODUCT_ID",
}

// Human-readable plan names used in Slack messages
var polarPlanDescriptions = map[string]string{
	"lifetime":        "lifetime",
	"monthly":         "monthly",
	"yearly":          "yearly",
	"lifetimeStudent": "lifetime student",
	"monthlyStudent":  "monthly student",
	"yearlyStudent":   "yearly student",
}

func getPolarPlanDescription(productId string) string {
	for plan, envVar := range polarPlanProductEnvVars {
		if productId != "" && os.Getenv(envVar) == productId {
			return polarPlanDescriptions[plan]
		}
	}
	return productId
}

// Price in the same shape the frontend previously received from Stripe
type polarPriceRecurring struct {
	Interval string `json:"interval"`
}

type polarPriceResponse struct {
	Id         string               `json:"id"`
	UnitAmount int64                `json:"unit_amount"`
	Recurring  *polarPriceRecurring `json:"recurring"`
}

const polarPriceCacheTTL = 10 * time.Minute

var polarPriceCache struct {
	sync.Mutex
	prices    map[string]polarPriceResponse
	fetchedAt time.Time
}

func fetchPolarPrices() (map[string]polarPriceResponse, error) {
	polarPriceCache.Lock()
	defer polarPriceCache.Unlock()

	if polarPriceCache.prices != nil && time.Since(polarPriceCache.fetchedAt) < polarPriceCacheTTL {
		return polarPriceCache.prices, nil
	}

	prices := make(map[string]polarPriceResponse)
	for plan, envVar := range polarPlanProductEnvVars {
		product, err := polar.GetProduct(os.Getenv(envVar))
		if err != nil {
			return nil, fmt.Errorf("fetching %s product: %w", plan, err)
		}
		amount, ok := product.FixedPrice()
		if !ok {
			return nil, fmt.Errorf("%s product %s has no fixed price", plan, product.Id)
		}
		var recurring *polarPriceRecurring
		if product.RecurringInterval != nil {
			recurring = &polarPriceRecurring{Interval: *product.RecurringInterval}
		}
		prices[plan] = polarPriceResponse{Id: product.Id, UnitAmount: amount, Recurring: recurring}
	}

	polarPriceCache.prices = prices
	polarPriceCache.fetchedAt = time.Now()
	return prices, nil
}

// @Summary Gets the prices of all premium plans
// @Tags polar
// @Produce json
// @Param exp query string false "Pricing experiment variant"
// @Success 200 {object} object{lifetime=object,monthly=object,yearly=object,lifetimeStudent=object,monthlyStudent=object,yearlyStudent=object}
// @Router /polar/price [get]
func getPolarPrice(c *gin.Context) {
	prices, err := fetchPolarPrices()
	if err != nil {
		logger.StdErr.Printf("Error fetching Polar prices: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}
	c.JSON(http.StatusOK, prices)
}

type PolarCheckoutSessionPayload struct {
	ProductID string `json:"productId" binding:"required"`
	OriginURL string `json:"originUrl" binding:"required"`
}

// Returns the /stripe-redirect URL the user lands on after checkout
func buildUpgradeRedirectUrl(upgradeStatus string, finalRedirectURL string) (string, error) {
	redirectURL, err := url.Parse(utils.GetBaseUrl())
	if err != nil {
		return "", err
	}
	redirectURL.Path = "/stripe-redirect"
	query := url.Values{}
	query.Set("upgrade", upgradeStatus)
	query.Set("redirect_url", finalRedirectURL)
	redirectURL.RawQuery = query.Encode()
	return redirectURL.String(), nil
}

// Returns the client IP if it is public, so Polar can detect the customer's country
func publicClientIp(c *gin.Context) string {
	ip := net.ParseIP(c.ClientIP())
	if ip == nil || !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() {
		return ""
	}
	return ip.String()
}

// @Summary Creates a Polar checkout session for the signed in user
// @Tags polar
// @Accept json
// @Produce json
// @Param payload body object{productId=string,originUrl=string} true "Product to purchase and URL to return to afterwards"
// @Success 200 {object} object{url=string}
// @Router /polar/create-checkout-session [post]
func createPolarCheckoutSession(c *gin.Context) {
	var payload PolarCheckoutSessionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	user := c.MustGet("authUser").(*models.User)

	successURL, err := buildUpgradeRedirectUrl("success", payload.OriginURL)
	if err != nil {
		logger.StdErr.Printf("Error building redirect URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error configuring redirect"})
		return
	}
	cancelURL, _ := buildUpgradeRedirectUrl("cancel", payload.OriginURL)

	userId := user.Id.Hex()
	checkout, err := polar.CreateCheckout(polar.CheckoutCreate{
		Products:           []string{payload.ProductID},
		ExternalCustomerId: userId,
		CustomerEmail:      user.Email,
		CustomerName:       fmt.Sprintf("%s %s", user.FirstName, user.LastName),
		CustomerIpAddress:  publicClientIp(c),
		Metadata:           map[string]any{"userId": userId},
		// Polar substitutes {CHECKOUT_ID} with the checkout session ID
		SuccessUrl: successURL + "&checkout_id={CHECKOUT_ID}",
		ReturnUrl:  cancelURL,
	})
	if err != nil {
		logger.StdErr.Printf("Error creating Polar checkout: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": checkout.Url})
}

type FulfillPolarCheckoutPayload struct {
	CheckoutID string `json:"checkoutId" binding:"required"`
}

// @Summary Fulfills a completed Polar checkout
// @Description Returns 202 if the payment is still being processed; the client should retry.
// @Tags polar
// @Accept json
// @Param payload body object{checkoutId=string} true "Polar checkout ID"
// @Produce json
// @Success 200 {object} object{status=string} "status is \"fulfilled\""
// @Success 202 {object} object{status=string} "status is \"pending\""
// @Router /polar/fulfill-checkout [post]
func fulfillPolarCheckout(c *gin.Context) {
	var payload FulfillPolarCheckoutPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	checkout, err := polar.GetCheckout(payload.CheckoutID)
	if err != nil {
		var apiErr *polar.APIError
		if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Checkout not found"})
			return
		}
		logger.StdErr.Printf("Error getting Polar checkout: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get checkout"})
		return
	}

	switch checkout.Status {
	case "succeeded":
		userId := utils.Coalesce(checkout.ExternalCustomerId)
		if userId == "" {
			userId = metadataString(checkout.Metadata, "userId")
		}
		fulfillPolarPurchase(userId, utils.Coalesce(checkout.CustomerId), utils.Coalesce(checkout.ProductId), checkout.TotalAmount)
		c.JSON(http.StatusOK, gin.H{"status": "fulfilled"})
	case "confirmed":
		// Payment is still processing
		c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Checkout not completed", "status": checkout.Status})
	}
}

func metadataString(metadata map[string]any, key string) string {
	if value, ok := metadata[key].(string); ok {
		return value
	}
	return ""
}

// fulfillPolarPurchase upgrades the user to premium. It is safe to call multiple
// times (e.g. from both the checkout redirect and the order.paid webhook): the
// Slack notification is only sent the first time a Polar customer is linked.
func fulfillPolarPurchase(userId string, polarCustomerId string, productId string, totalAmount int64) {
	userIdObj, err := primitive.ObjectIDFromHex(userId)
	if err != nil || polarCustomerId == "" {
		logger.StdErr.Printf("Cannot fulfill Polar purchase: userId=%q customerId=%q", userId, polarCustomerId)
		return
	}

	// Link the Polar customer, only matching if it isn't linked yet
	result, err := db.UsersCollection.UpdateOne(context.Background(),
		bson.M{"_id": userIdObj, "polarCustomerId": bson.M{"$ne": polarCustomerId}},
		bson.M{"$set": bson.M{"polarCustomerId": polarCustomerId, "isPremium": true}},
	)
	if err != nil {
		logger.StdErr.Printf("Error fulfilling Polar purchase: %v", err)
		return
	}

	if result.ModifiedCount == 0 {
		// Already linked (e.g. a renewal), just make sure the user is premium
		db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": userIdObj}, bson.M{"$set": bson.M{"isPremium": true}})
		return
	}

	logger.StdOut.Printf("Fulfilled Polar purchase for user %s (customer %s)\n", userId, polarCustomerId)
	user := db.GetUserById(userId)
	if user == nil {
		return
	}
	amount := float32(totalAmount) / 100.0
	message := fmt.Sprintf(":moneybag: %s %s (%s) paid for Schej ($%.2f, %s) :moneybag:", user.FirstName, user.LastName, user.Email, amount, getPolarPlanDescription(productId))
	slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
}

// setPolarCustomerPremium sets isPremium for the user linked to a Polar customer
func setPolarCustomerPremium(polarCustomerId string, isPremium bool) *models.User {
	user := db.GetUserByPolarCustomerId(polarCustomerId)
	if user == nil {
		logger.StdErr.Printf("No user found for Polar customer %s", polarCustomerId)
		return nil
	}
	db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": user.Id}, bson.M{"$set": bson.M{"isPremium": isPremium}})
	return user
}

// @Summary Receives Polar webhook events
// @Tags polar
// @Accept json
// @Success 200
// @Router /polar/webhook [post]
func polarWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.StdErr.Printf("Error reading request body: %v", err)
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}

	secret := os.Getenv("POLAR_WEBHOOK_SECRET")
	if secret == "" {
		logger.StdErr.Println("POLAR_WEBHOOK_SECRET not set")
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	if err := polar.VerifyWebhook(body, c.Request.Header, secret); err != nil {
		logger.StdErr.Printf("Error verifying Polar webhook signature: %v", err)
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	var event polar.WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		logger.StdErr.Printf("Error parsing Polar webhook JSON: %v", err)
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "order.paid":
		var order polar.Order
		if err := json.Unmarshal(event.Data, &order); err != nil {
			logger.StdErr.Printf("Error parsing Polar order: %v", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		userId := utils.Coalesce(order.Customer.ExternalId)
		if userId == "" {
			userId = metadataString(order.Metadata, "userId")
		}
		fulfillPolarPurchase(userId, order.CustomerId, utils.Coalesce(order.ProductId), order.TotalAmount)

	case "subscription.active", "subscription.past_due", "subscription.revoked":
		var sub polar.Subscription
		if err := json.Unmarshal(event.Data, &sub); err != nil {
			logger.StdErr.Printf("Error parsing Polar subscription: %v", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		isPremium := event.Type == "subscription.active"
		user := setPolarCustomerPremium(sub.CustomerId, isPremium)
		if user == nil {
			break
		}

		switch event.Type {
		case "subscription.past_due":
			logger.StdOut.Printf("Polar customer %s failed to pay for Schej!\n", sub.CustomerId)
			message := fmt.Sprintf(":x: %s %s (%s) failed to pay for Schej :x:", user.FirstName, user.LastName, user.Email)
			slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
		case "subscription.revoked":
			logger.StdOut.Printf("Polar customer %s subscription ended!\n", sub.CustomerId)
			message := fmt.Sprintf(":x: %s %s (%s) cancelled their subscription :x:", user.FirstName, user.LastName, user.Email)
			slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
		}
	}

	c.Status(http.StatusOK)
}

// @Summary Gets a Polar customer portal URL for the signed in user
// @Tags polar
// @Produce json
// @Param returnUrl query string false "URL to return to from the portal"
// @Success 200 {object} object{url=string}
// @Router /polar/billing-portal [get]
func getPolarBillingPortalUrl(c *gin.Context) {
	user := c.MustGet("authUser").(*models.User)

	if user.PolarCustomerId == nil || *user.PolarCustomerId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User has no Polar customer ID"})
		return
	}

	returnURL := c.Query("returnUrl")
	if returnURL == "" {
		returnURL = utils.GetBaseUrl()
	}

	portalURL, err := polar.CreateCustomerPortalUrl(*user.PolarCustomerId, returnURL)
	if err != nil {
		logger.StdErr.Printf("Error creating Polar customer session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create billing portal session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": portalURL})
}
