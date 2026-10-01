// Package polar is a minimal client for the Polar REST API (https://polar.sh/docs/api-reference)
// along with Standard Webhooks signature verification for Polar webhooks.
package polar

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// API version all requests are pinned to
const apiVersion = "2026-10"

var httpClient = &http.Client{Timeout: 15 * time.Second}

func baseURL() string {
	if os.Getenv("POLAR_SERVER") == "sandbox" {
		return "https://sandbox-api.polar.sh/v1"
	}
	return "https://api.polar.sh/v1"
}

// APIError is returned when Polar responds with a non-2xx status
type APIError struct {
	StatusCode int
	Body       string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("polar api error %d: %s", e.StatusCode, e.Body)
}

func do(method, path string, body any, out any) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, baseURL()+path, reqBody)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("POLAR_ACCESS_TOKEN"))
	req.Header.Set("Polar-Version", apiVersion)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &APIError{StatusCode: resp.StatusCode, Body: string(respBody)}
	}
	if out != nil {
		return json.Unmarshal(respBody, out)
	}
	return nil
}

// Customer is the subset of a Polar customer embedded in orders and subscriptions
type Customer struct {
	Id         string  `json:"id"`
	Email      string  `json:"email"`
	ExternalId *string `json:"external_id"`
}

type Price struct {
	Id          string `json:"id"`
	AmountType  string `json:"amount_type"`
	PriceAmount int64  `json:"price_amount"`
	IsArchived  bool   `json:"is_archived"`
}

type Product struct {
	Id                string  `json:"id"`
	Name              string  `json:"name"`
	RecurringInterval *string `json:"recurring_interval"`
	Prices            []Price `json:"prices"`
}

// FixedPrice returns the amount (in cents) of the product's active fixed price
func (p *Product) FixedPrice() (int64, bool) {
	for _, price := range p.Prices {
		if price.AmountType == "fixed" && !price.IsArchived {
			return price.PriceAmount, true
		}
	}
	return 0, false
}

type Checkout struct {
	Id                 string         `json:"id"`
	Url                string         `json:"url"`
	Status             string         `json:"status"`
	CustomerId         *string        `json:"customer_id"`
	ExternalCustomerId *string        `json:"external_customer_id"`
	ProductId          *string        `json:"product_id"`
	TotalAmount        int64          `json:"total_amount"`
	Metadata           map[string]any `json:"metadata"`
}

type CheckoutCreate struct {
	Products           []string       `json:"products"`
	ExternalCustomerId string         `json:"external_customer_id,omitempty"`
	CustomerEmail      string         `json:"customer_email,omitempty"`
	CustomerName       string         `json:"customer_name,omitempty"`
	CustomerIpAddress  string         `json:"customer_ip_address,omitempty"`
	Metadata           map[string]any `json:"metadata,omitempty"`
	SuccessUrl         string         `json:"success_url,omitempty"`
	ReturnUrl          string         `json:"return_url,omitempty"`
}

type Order struct {
	Id            string         `json:"id"`
	Status        string         `json:"status"`
	BillingReason string         `json:"billing_reason"`
	TotalAmount   int64          `json:"total_amount"`
	CustomerId    string         `json:"customer_id"`
	ProductId     *string        `json:"product_id"`
	Customer      Customer       `json:"customer"`
	Metadata      map[string]any `json:"metadata"`
}

type Subscription struct {
	Id         string   `json:"id"`
	Status     string   `json:"status"`
	CustomerId string   `json:"customer_id"`
	Customer   Customer `json:"customer"`
}

func CreateCheckout(params CheckoutCreate) (*Checkout, error) {
	var checkout Checkout
	if err := do(http.MethodPost, "/checkouts/", params, &checkout); err != nil {
		return nil, err
	}
	return &checkout, nil
}

func GetCheckout(id string) (*Checkout, error) {
	var checkout Checkout
	if err := do(http.MethodGet, "/checkouts/"+id, nil, &checkout); err != nil {
		return nil, err
	}
	return &checkout, nil
}

func GetProduct(id string) (*Product, error) {
	var product Product
	if err := do(http.MethodGet, "/products/"+id, nil, &product); err != nil {
		return nil, err
	}
	return &product, nil
}

// CreateCustomerPortalUrl creates a customer session and returns a pre-authenticated
// customer portal URL
func CreateCustomerPortalUrl(customerId string, returnUrl string) (string, error) {
	body := map[string]any{"customer_id": customerId}
	if returnUrl != "" {
		body["return_url"] = returnUrl
	}
	var session struct {
		CustomerPortalUrl string `json:"customer_portal_url"`
	}
	if err := do(http.MethodPost, "/customer-sessions/", body, &session); err != nil {
		return "", err
	}
	return session.CustomerPortalUrl, nil
}

// WebhookEvent is the envelope of every Polar webhook payload
type WebhookEvent struct {
	Type      string          `json:"type"`
	Timestamp string          `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

var ErrInvalidSignature = errors.New("invalid webhook signature")

// Webhook timestamps further than this from now are rejected to prevent replays
const webhookTolerance = 5 * time.Minute

// VerifyWebhook verifies a Standard Webhooks signature. Polar secrets generated
// on or after 2026-09-08 use the standard key derivation (base64-decoded secret
// after the `whsec_` prefix); older secrets use the raw UTF-8 bytes of the full
// secret. Both are tried.
func VerifyWebhook(body []byte, headers http.Header, secret string) error {
	return verifyWebhookAt(body, headers, secret, time.Now())
}

func verifyWebhookAt(body []byte, headers http.Header, secret string, now time.Time) error {
	id := headers.Get("webhook-id")
	timestamp := headers.Get("webhook-timestamp")
	signatures := headers.Get("webhook-signature")
	if id == "" || timestamp == "" || signatures == "" {
		return ErrInvalidSignature
	}

	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrInvalidSignature
	}
	diff := now.Sub(time.Unix(ts, 0))
	if diff > webhookTolerance || diff < -webhookTolerance {
		return ErrInvalidSignature
	}

	secret = strings.TrimSpace(secret)
	keys := [][]byte{[]byte(secret)} // legacy Polar derivation
	if decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(secret, "whsec_")); err == nil {
		keys = append([][]byte{decoded}, keys...)
	}

	signedContent := []byte(id + "." + timestamp + "." + string(body))
	for _, key := range keys {
		mac := hmac.New(sha256.New, key)
		mac.Write(signedContent)
		expected := mac.Sum(nil)

		for _, sig := range strings.Fields(signatures) {
			version, value, found := strings.Cut(sig, ",")
			if !found || version != "v1" {
				continue
			}
			decoded, err := base64.StdEncoding.DecodeString(value)
			if err != nil {
				continue
			}
			if hmac.Equal(decoded, expected) {
				return nil
			}
		}
	}
	return ErrInvalidSignature
}
