package auth

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// This file implements generic OpenID Connect (OIDC) support so users can
// sign in / create an account via any configured OIDC provider, env vars:
//
//   OIDC_ISSUER_URL     - e.g. https://id.example.com
//   OIDC_CLIENT_ID
//   OIDC_CLIENT_SECRET

// OidcDiscoveryDocument mirrors the subset of an OIDC discovery document
// (OpenID Connect Discovery 1.0, served at
// {issuer}/.well-known/openid-configuration) that we need to drive the
// authorization-code flow and verify ID tokens.
type OidcDiscoveryDocument struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
	JwksUri               string `json:"jwks_uri"`
}

type oidcJwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type oidcJwkSet struct {
	Keys []oidcJwk `json:"keys"`
}

var (
	oidcDiscoveryOnce sync.Once
	oidcDiscovery     OidcDiscoveryDocument
	oidcDiscoveryErr  error

	oidcJwksMu      sync.RWMutex
	oidcJwksCache   oidcJwkSet
	oidcJwksFetched time.Time
)

// oidcJwksTTL controls how often we refetch the provider's signing keys.
const oidcJwksTTL = 10 * time.Minute

// getOidcDiscoveryDocument fetches and caches the OIDC provider's discovery
// document for the lifetime of the process.
func getOidcDiscoveryDocument() (OidcDiscoveryDocument, error) {
	oidcDiscoveryOnce.Do(func() {
		issuer := strings.TrimRight(os.Getenv("OIDC_ISSUER_URL"), "/")
		if issuer == "" {
			oidcDiscoveryErr = errors.New("OIDC_ISSUER_URL is not configured")
			return
		}

		resp, err := http.Get(issuer + "/.well-known/openid-configuration")
		if err != nil {
			oidcDiscoveryErr = fmt.Errorf("failed to fetch OIDC discovery document: %w", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			oidcDiscoveryErr = fmt.Errorf("OIDC discovery document request failed with status %d", resp.StatusCode)
			return
		}

		var doc OidcDiscoveryDocument
		if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
			oidcDiscoveryErr = fmt.Errorf("failed to decode OIDC discovery document: %w", err)
			return
		}

		// The discovery doc's issuer must match what we configured, or a
		// misconfigured/compromised endpoint could point us at a different
		// provider entirely.
		if doc.Issuer != issuer {
			oidcDiscoveryErr = fmt.Errorf("OIDC discovery document issuer mismatch: expected %s, got %s", issuer, doc.Issuer)
			return
		}

		oidcDiscovery = doc
	})

	return oidcDiscovery, oidcDiscoveryErr
}

// GetOidcTokenEndpoint exposes the provider's token endpoint, used when
// exchanging an authorization code for tokens.
func GetOidcTokenEndpoint() string {
	doc, err := getOidcDiscoveryDocument()
	if err != nil {
		return ""
	}
	return doc.TokenEndpoint
}

// getOidcJwks returns the provider's current JSON Web Key Set, refetching at
// most once every oidcJwksTTL.
func getOidcJwks(forceRefresh bool) (oidcJwkSet, error) {
	if !forceRefresh {
		oidcJwksMu.RLock()
		fresh := time.Since(oidcJwksFetched) < oidcJwksTTL && len(oidcJwksCache.Keys) > 0
		cached := oidcJwksCache
		oidcJwksMu.RUnlock()
		if fresh {
			return cached, nil
		}
	}

	doc, err := getOidcDiscoveryDocument()
	if err != nil {
		return oidcJwkSet{}, err
	}
	if doc.JwksUri == "" {
		return oidcJwkSet{}, errors.New("OIDC discovery document did not include a jwks_uri")
	}

	resp, err := http.Get(doc.JwksUri)
	if err != nil {
		return oidcJwkSet{}, fmt.Errorf("failed to fetch OIDC JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return oidcJwkSet{}, fmt.Errorf("OIDC JWKS request failed with status %d", resp.StatusCode)
	}

	var set oidcJwkSet
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return oidcJwkSet{}, fmt.Errorf("failed to decode OIDC JWKS: %w", err)
	}

	oidcJwksMu.Lock()
	oidcJwksCache = set
	oidcJwksFetched = time.Now()
	oidcJwksMu.Unlock()

	return set, nil
}

func findOidcRsaPublicKey(set oidcJwkSet, kid string) (*rsa.PublicKey, error) {
	for _, key := range set.Keys {
		if key.Kty != "RSA" || key.Kid != kid {
			continue
		}

		nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
		if err != nil {
			return nil, fmt.Errorf("invalid JWK modulus: %w", err)
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
		if err != nil {
			return nil, fmt.Errorf("invalid JWK exponent: %w", err)
		}

		return &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: int(new(big.Int).SetBytes(eBytes).Int64()),
		}, nil
	}

	return nil, fmt.Errorf("no matching JWK found for kid %q", kid)
}

// OidcIdTokenClaims holds the subset of standard OIDC claims we rely on.
type OidcIdTokenClaims struct {
	Iss           string
	Sub           string
	Email         string
	EmailVerified bool
	GivenName     string
	FamilyName    string
	Name          string
	Picture       string
}

// rawOidcClaims is used for the initial decode since `aud` may legally be
// either a string or an array of strings, and we need to normalize it before
// checking it.
type rawOidcClaims struct {
	Iss           string          `json:"iss"`
	Sub           string          `json:"sub"`
	Aud           json.RawMessage `json:"aud"`
	Exp           int64           `json:"exp"`
	Email         string          `json:"email"`
	EmailVerified bool            `json:"email_verified"`
	GivenName     string          `json:"given_name"`
	FamilyName    string          `json:"family_name"`
	Name          string          `json:"name"`
	Picture       string          `json:"picture"`
}

func normalizeOidcAud(raw json.RawMessage) []string {
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		return []string{single}
	}
	var multi []string
	if err := json.Unmarshal(raw, &multi); err == nil {
		return multi
	}
	return nil
}

// VerifyOidcIdToken validates an OIDC ID token's RS256 signature (against the
// provider's published JWKS), issuer, audience, expiry, and verified-email
// claim, then returns its claims.
//
// The ID token reaches us via the server-to-server authorization-code
// exchange, but we still verify it fully rather than just decoding it:
// skipping verification would let a compromised/misconfigured token endpoint,
// or a MITM on that connection, forge arbitrary claims and sign in as anyone.
func VerifyOidcIdToken(idToken string) (OidcIdTokenClaims, error) {
	if strings.TrimSpace(idToken) == "" {
		return OidcIdTokenClaims{}, errors.New("id token is empty")
	}

	clientId := os.Getenv("OIDC_CLIENT_ID")
	if clientId == "" {
		return OidcIdTokenClaims{}, errors.New("OIDC_CLIENT_ID is not configured")
	}

	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return OidcIdTokenClaims{}, errors.New("malformed id token")
	}

	headerJson, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return OidcIdTokenClaims{}, fmt.Errorf("invalid id token header encoding: %w", err)
	}
	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := json.Unmarshal(headerJson, &header); err != nil {
		return OidcIdTokenClaims{}, fmt.Errorf("invalid id token header: %w", err)
	}
	// We only support RS256. Refuse anything else outright.
	if header.Alg != "RS256" {
		return OidcIdTokenClaims{}, fmt.Errorf("unsupported id token signing algorithm: %s", header.Alg)
	}

	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return OidcIdTokenClaims{}, fmt.Errorf("invalid id token signature encoding: %w", err)
	}

	pubKey, err := getOidcSigningKey(header.Kid)
	if err != nil {
		return OidcIdTokenClaims{}, err
	}

	signedInput := parts[0] + "." + parts[1]
	hashed := sha256.Sum256([]byte(signedInput))
	if err := rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed[:], signature); err != nil {
		return OidcIdTokenClaims{}, errors.New("id token signature verification failed")
	}

	payloadJson, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return OidcIdTokenClaims{}, fmt.Errorf("invalid id token payload encoding: %w", err)
	}
	var raw rawOidcClaims
	if err := json.Unmarshal(payloadJson, &raw); err != nil {
		return OidcIdTokenClaims{}, fmt.Errorf("invalid id token payload: %w", err)
	}

	doc, err := getOidcDiscoveryDocument()
	if err != nil {
		return OidcIdTokenClaims{}, err
	}
	if raw.Iss != doc.Issuer {
		return OidcIdTokenClaims{}, fmt.Errorf("unexpected id token issuer: %s", raw.Iss)
	}

	audOk := false
	for _, aud := range normalizeOidcAud(raw.Aud) {
		if aud == clientId {
			audOk = true
			break
		}
	}
	if !audOk {
		return OidcIdTokenClaims{}, errors.New("id token audience mismatch")
	}

	if raw.Exp == 0 || time.Now().After(time.Unix(raw.Exp, 0)) {
		return OidcIdTokenClaims{}, errors.New("id token has expired")
	}

	if !raw.EmailVerified {
		return OidcIdTokenClaims{}, errors.New("id token email is not verified by the provider")
	}
	if strings.TrimSpace(raw.Email) == "" {
		return OidcIdTokenClaims{}, errors.New("id token did not include an email claim")
	}

	return OidcIdTokenClaims{
		Iss:           raw.Iss,
		Sub:           raw.Sub,
		Email:         raw.Email,
		EmailVerified: raw.EmailVerified,
		GivenName:     raw.GivenName,
		FamilyName:    raw.FamilyName,
		Name:          raw.Name,
		Picture:       raw.Picture,
	}, nil
}

// getOidcSigningKey looks up the RSA public key for the given `kid`,
// transparently forcing one JWKS refetch if it's not found in the cache
// (keys may have rotated since we last fetched them).
func getOidcSigningKey(kid string) (*rsa.PublicKey, error) {
	set, err := getOidcJwks(false)
	if err != nil {
		return nil, err
	}
	if key, err := findOidcRsaPublicKey(set, kid); err == nil {
		return key, nil
	}

	set, err = getOidcJwks(true)
	if err != nil {
		return nil, err
	}
	return findOidcRsaPublicKey(set, kid)
}