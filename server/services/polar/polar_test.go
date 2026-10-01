package polar

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strconv"
	"testing"
	"time"
)

func sign(key []byte, id, timestamp string, body []byte) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id + "." + timestamp + "." + string(body)))
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func headersFor(id string, ts time.Time, signature string) http.Header {
	h := http.Header{}
	h.Set("webhook-id", id)
	h.Set("webhook-timestamp", strconv.FormatInt(ts.Unix(), 10))
	h.Set("webhook-signature", signature)
	return h
}

func TestVerifyWebhook(t *testing.T) {
	now := time.Unix(1790000000, 0)
	ts := strconv.FormatInt(now.Unix(), 10)
	body := []byte(`{"type":"order.paid","data":{}}`)

	rawKey := []byte("0123456789abcdef0123456789abcdef")
	standardSecret := "whsec_" + base64.StdEncoding.EncodeToString(rawKey)
	legacySecret := "whsec_legacy_polar_secret"

	tests := []struct {
		name    string
		secret  string
		headers http.Header
		body    []byte
		wantErr bool
	}{
		{"standard secret", standardSecret, headersFor("msg_1", now, sign(rawKey, "msg_1", ts, body)), body, false},
		{"legacy secret", legacySecret, headersFor("msg_1", now, sign([]byte(legacySecret), "msg_1", ts, body)), body, false},
		{"multiple signatures", standardSecret, headersFor("msg_1", now, "v1,bm9wZQ== "+sign(rawKey, "msg_1", ts, body)), body, false},
		{"tampered body", standardSecret, headersFor("msg_1", now, sign(rawKey, "msg_1", ts, body)), []byte(`{"type":"order.paid","data":{"x":1}}`), true},
		{"wrong secret", "whsec_" + base64.StdEncoding.EncodeToString([]byte("other")), headersFor("msg_1", now, sign(rawKey, "msg_1", ts, body)), body, true},
		{"stale timestamp", standardSecret, headersFor("msg_1", now.Add(-10*time.Minute), sign(rawKey, "msg_1", strconv.FormatInt(now.Add(-10*time.Minute).Unix(), 10), body)), body, true},
		{"missing headers", standardSecret, http.Header{}, body, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyWebhookAt(tt.body, tt.headers, tt.secret, now)
			if (err != nil) != tt.wantErr {
				t.Fatalf("verifyWebhookAt() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
