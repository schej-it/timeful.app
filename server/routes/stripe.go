package routes

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	portalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	"github.com/stripe/stripe-go/v82/checkout/session"
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

// Stripe is kept for legacy subscribers whose subscriptions still renew on
// Stripe. New purchases go through Polar (see polar.go).
func InitStripe(router *gin.RouterGroup) {
	stripeRouter := router.Group("/stripe")

	stripeRouter.POST("/fulfill-checkout", fulfillCheckout)
	stripeRouter.POST("/webhook", stripeWebhook)
	stripeRouter.GET("/billing-portal", middleware.AuthRequired(), getBillingPortalUrl)
}

type FulfillCheckoutPayload struct {
	SessionID string `json:"sessionId" binding:"required"`
}

func fulfillCheckout(c *gin.Context) {
	var payload FulfillCheckoutPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	_fulfillCheckout(payload.SessionID)
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

	// Use the authenticated user's Stripe customer ID
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
