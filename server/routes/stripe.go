package routes

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	portalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/price"
	"github.com/stripe/stripe-go/v82/webhook"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/logger"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/slackbot"
	"schej.it/server/utils"
)

func InitStripe(router *gin.RouterGroup) {
	stripeRouter := router.Group("/stripe")

	stripeRouter.POST("/create-checkout-session", middleware.AuthRequired(), createCheckoutSession)
	stripeRouter.GET("/price", getPrice)
	stripeRouter.POST("/fulfill-checkout", middleware.AuthRequired(), fulfillCheckout)
	stripeRouter.POST("/webhook", stripeWebhook)
	stripeRouter.GET("/billing-portal", middleware.AuthRequired(), getBillingPortalUrl)
}

type CheckoutSessionPayload struct {
	PriceID        string `json:"priceId" binding:"required"`
	UserID         string `json:"userId" binding:"required"`
	IsSubscription *bool  `json:"isSubscription" binding:"required"`
	OriginURL      string `json:"originUrl" binding:"required"`
}

func createCheckoutSession(c *gin.Context) {
	// Get authenticated user
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	var payload CheckoutSessionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	originURL := payload.OriginURL
	finalRedirectURL := originURL // This is where the user should end up AFTER the /stripe-redirect page

	// Get the base URL for constructing the intermediate redirect path
	baseURL := utils.GetBaseUrl()
	intermediateRedirectBase, err := url.Parse(baseURL)
	if err != nil {
		logger.StdErr.Printf("Error parsing Base URL '%s': %v. Cannot construct redirect URLs.", baseURL, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error configuring redirect"})
		return
	}

	// Create success URL (points to /stripe-redirect)
	successURL := *intermediateRedirectBase // Start with base URL
	successURL.Path = "/stripe-redirect"    // Set path
	successQuery := url.Values{}
	successQuery.Set("upgrade", "success")
	successQuery.Set("redirect_url", finalRedirectURL) // Add the final destination
	successURL.RawQuery = successQuery.Encode()
	successURLStr := successURL.String()

	// Create cancel URL (points to /stripe-redirect)
	cancelURL := *intermediateRedirectBase // Start with base URL
	cancelURL.Path = "/stripe-redirect"    // Set path
	cancelQuery := url.Values{}
	cancelQuery.Set("upgrade", "cancel")
	cancelQuery.Set("redirect_url", finalRedirectURL) // Add the final destination
	cancelURL.RawQuery = cancelQuery.Encode()
	cancelURLStr := cancelURL.String()

	params := &stripe.CheckoutSessionParams{
		ClientReferenceID: stripe.String(user.Id.Hex()), // Use authenticated user, not client-supplied
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				// Provide the exact Price ID (for example, price_1234) of the product you want to sell
				Price:    stripe.String(payload.PriceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL:   stripe.String(successURLStr + "&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:    stripe.String(cancelURLStr),
		AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
		// Provide the Customer ID (for example, cus_1234) for an existing customer to associate it with this session
		// Customer: "cus_RnhPlBnbBbXapY",
	}
	if *payload.IsSubscription {
		params.Mode = stripe.String(string(stripe.CheckoutSessionModeSubscription))
	} else {
		params.Mode = stripe.String(string(stripe.CheckoutSessionModePayment))
		params.CustomerCreation = stripe.String(string(stripe.CheckoutSessionCustomerCreationAlways))
		params.InvoiceCreation = &stripe.CheckoutSessionInvoiceCreationParams{Enabled: stripe.Bool(true)}
	}

	s, err := session.New(params)

	if err != nil {
		log.Printf("session.New: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": s.URL})
}

func getPrice(c *gin.Context) {
	// Get the experiment query parameter
	exp := c.Query("exp")

	monthlyPriceId := os.Getenv("STRIPE_MONTHLY_PRICE_ID")
	monthlyStudentPriceId := os.Getenv("STRIPE_MONTHLY_STUDENT_PRICE_ID")
	lifetimeStudentPriceId := os.Getenv("STRIPE_LIFETIME_STUDENT_PRICE_ID")
	yearlyPriceId := os.Getenv("STRIPE_YEARLY_PRICE_ID")
	yearlyStudentPriceId := os.Getenv("STRIPE_YEARLY_STUDENT_PRICE_ID")

	var lifetimePriceId string
	switch exp {
	case "test":
		// lifetimePriceId = os.Getenv("STRIPE_LIFETIME_PRICE_ID_2")
		lifetimePriceId = os.Getenv("STRIPE_LIFETIME_PRICE_ID")
	default:
		lifetimePriceId = os.Getenv("STRIPE_LIFETIME_PRICE_ID")
	}

	params := &stripe.PriceParams{}
	monthlyResult, err := price.Get(monthlyPriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	lifetimeResult, err := price.Get(lifetimePriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	monthlyStudentResult, err := price.Get(monthlyStudentPriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	lifetimeStudentResult, err := price.Get(lifetimeStudentPriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	yearlyResult, err := price.Get(yearlyPriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	yearlyStudentResult, err := price.Get(yearlyStudentPriceId, params)
	if err != nil {
		log.Printf("price.Get error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"lifetime":        lifetimeResult,
		"monthly":         monthlyResult,
		"yearly":          yearlyResult,
		"lifetimeStudent": lifetimeStudentResult,
		"monthlyStudent":  monthlyStudentResult,
		"yearlyStudent":   yearlyStudentResult,
	})
}

type FulfillCheckoutPayload struct {
	SessionID string `json:"sessionId" binding:"required"`
}

func fulfillCheckout(c *gin.Context) {
	// Get authenticated user
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	var payload FulfillCheckoutPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	// Verify the session belongs to this user
	params := &stripe.CheckoutSessionParams{}
	cs, err := session.Get(payload.SessionID, params)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	if cs.ClientReferenceID != user.Id.Hex() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Session does not belong to this user"})
		return
	}

	_fulfillCheckout(payload.SessionID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func _fulfillCheckout(sessionId string) {
	// TODO: Make this function safe to run multiple times,
	// even concurrently, with the same session ID

	// TODO: Make sure fulfillment hasn't already been
	// performed for this Checkout Session

	// Retrieve the Checkout Session from the API with line_items expanded
	params := &stripe.CheckoutSessionParams{}
	params.AddExpand("line_items")

	cs, _ := session.Get(sessionId, params)

	// Check the Checkout Session's payment_status property
	// to determine if fulfillment should be performed
	if cs.PaymentStatus != stripe.CheckoutSessionPaymentStatusUnpaid {
		logger.StdOut.Println("Fulfilling Checkout Session " + sessionId)
		if cs.Customer != nil {
			logger.StdOut.Println("Setting stripe customer ID", cs.Customer.ID)

			// Fetch user from database
			userId := cs.ClientReferenceID
			userIdObj, err := primitive.ObjectIDFromHex(userId)
			if err != nil {
				logger.StdErr.Printf("Error parsing user ID: %v", err)
				return
			}
			user := db.GetUserById(userId)
			if user == nil {
				logger.StdErr.Printf("Error getting user: %v", err)
				return
			}

			// Only upgrade the user if customer ID is different
			if user.StripeCustomerId == nil || *user.StripeCustomerId != cs.Customer.ID {
				if cs.LineItems != nil && len(cs.LineItems.Data) > 0 {
					price := cs.LineItems.Data[0].Price
					priceId := price.ID
					priceDescription := ""
					if priceId == os.Getenv("STRIPE_LIFETIME_PRICE_ID") {
						priceDescription = "lifetime"
					} else if priceId == os.Getenv("STRIPE_MONTHLY_PRICE_ID") {
						priceDescription = "monthly"
					} else if priceId == os.Getenv("STRIPE_YEARLY_PRICE_ID") {
						priceDescription = "yearly"
					} else if priceId == os.Getenv("STRIPE_LIFETIME_STUDENT_PRICE_ID") {
						priceDescription = "lifetime student"
					} else if priceId == os.Getenv("STRIPE_MONTHLY_STUDENT_PRICE_ID") {
						priceDescription = "monthly student"
					}
					amountTotal := float32(cs.LineItems.Data[0].AmountTotal) / 100.0

					message := fmt.Sprintf(":moneybag: %s %s (%s) paid for Schej ($%.2f, %s) :moneybag:", user.FirstName, user.LastName, user.Email, amountTotal, priceDescription)
					slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
				}

				user.StripeCustomerId = &cs.Customer.ID
				user.IsPremium = utils.TruePtr()
				db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": userIdObj}, bson.M{"$set": user})
			}
		}
	}
}

func stripeWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.StdErr.Printf("Error reading request body: %v", err)
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}

	// Pass the request body and Stripe-Signature header to ConstructEvent, along with the webhook signing key.
	// Use the secret provided by your webhook endpoint settings or Stripe CLI.
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if endpointSecret == "" {
		logger.StdErr.Println("STRIPE_WEBHOOK_SECRET not set")
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	event, err := webhook.ConstructEvent(body, c.GetHeader("Stripe-Signature"), endpointSecret)

	if err != nil {
		logger.StdErr.Printf("Error verifying webhook signature: %v", err)
		c.AbortWithStatus(http.StatusBadRequest) // Return a 400 error on a bad signature
		return
	}

	// Handle the event
	if event.Type == stripe.EventTypeCheckoutSessionCompleted || event.Type == stripe.EventTypeCheckoutSessionAsyncPaymentSucceeded {
		var cs stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &cs)
		if err != nil {
			logger.StdErr.Printf("Error parsing webhook JSON: %v\n", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		logger.StdOut.Printf("Checkout Session %s completed!\n", cs.ID)
		_fulfillCheckout(cs.ID) // Call fulfillCheckout when session is completed
	} else if event.Type == stripe.EventTypeInvoicePaid {
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			logger.StdErr.Printf("Error parsing webhook JSON: %v\n", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		db.UsersCollection.UpdateOne(context.Background(), bson.M{"stripeCustomerId": inv.Customer.ID}, bson.M{"$set": bson.M{"isPremium": true}})
		logger.StdOut.Printf("Customer %s renewed Schej!\n", inv.Customer.ID)
	} else if event.Type == stripe.EventTypeInvoicePaymentFailed {
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			logger.StdErr.Printf("Error parsing webhook JSON: %v\n", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		user := db.GetUserByStripeCustomerId(inv.Customer.ID)
		if user == nil {
			logger.StdErr.Printf("Error getting user: %v", err)
			return
		}
		db.UsersCollection.UpdateOne(context.Background(), bson.M{"stripeCustomerId": inv.Customer.ID}, bson.M{"$set": bson.M{"isPremium": false}})
		logger.StdOut.Printf("Customer %s failed to pay for Schej!\n", inv.Customer.ID)

		message := fmt.Sprintf(":x: %s %s (%s) failed to pay for Schej :x:", user.FirstName, user.LastName, user.Email)
		slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
	} else if event.Type == stripe.EventTypeCustomerSubscriptionDeleted {
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			logger.StdErr.Printf("Error parsing webhook JSON: %v\n", err)
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		user := db.GetUserByStripeCustomerId(sub.Customer.ID)
		if user == nil {
			logger.StdErr.Printf("Error getting user: %v", err)
			return
		}
		db.UsersCollection.UpdateOne(context.Background(), bson.M{"stripeCustomerId": sub.Customer.ID}, bson.M{"$set": bson.M{"isPremium": false}})
		logger.StdOut.Printf("Customer %s cancelled their subscription!\n", sub.Customer.ID)

		message := fmt.Sprintf(":x: %s %s (%s) cancelled their subscription :x:", user.FirstName, user.LastName, user.Email)
		slackbot.SendTextMessageWithType(message, slackbot.MONETIZATION)
	}

	c.Status(http.StatusOK) // Return 200 OK to acknowledge receipt of the event
}

func getBillingPortalUrl(c *gin.Context) {
	// Get authenticated user
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)

	// The URL to which the user is redirected when they're done managing
	// billing in the portal.
	returnURL := c.Query("returnUrl")
	if returnURL == "" {
		returnURL = utils.GetBaseUrl() // Fallback to base URL if not provided
	}

	// Use the authenticated user's Stripe customer ID, not client-supplied
	if user.StripeCustomerId == nil || *user.StripeCustomerId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User has no Stripe customer ID"})
		return
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*user.StripeCustomerId),
		ReturnURL: stripe.String(returnURL),
	}
	ps, err := portalsession.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create billing portal session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": ps.URL})
}
