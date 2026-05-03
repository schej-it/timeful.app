package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/logger"
	"schej.it/server/models"
	"schej.it/server/utils"
)

// Returns access, refresh, and id tokens from the auth code
func GetTokensFromAuthCode(code string, scope string, origin string, calendarType models.CalendarType) TokenResponse {
	clientId, clientSecret := getCredentialsFromCalendarType(calendarType)
	tokenEndpoint := getTokenEndpointFromCalendarType(calendarType)

	// Call Google oauth token endpoint
	redirectUri := fmt.Sprintf("%s/auth", origin)
	values := url.Values{
		"client_id":     {clientId},
		"client_secret": {clientSecret},
		"code":          {code},
		"scope":         {scope},
		"redirect_uri":  {redirectUri},
		"grant_type":    {"authorization_code"},
	}
	resp, err := http.PostForm(
		tokenEndpoint,
		values,
	)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer resp.Body.Close()

	var res TokenResponse

	json.NewDecoder(resp.Body).Decode(&res)
	if len(res.Error) > 0 {
		data, _ := json.MarshalIndent(res, "", "  ")
		logger.StdErr.Panicln(string(data))
	}

	return res
}

func RefreshAccessToken(accountAuth *models.OAuth2CalendarAuth, calendarType models.CalendarType) AccessTokenResponse {
	clientId, clientSecret := getCredentialsFromCalendarType(calendarType)
	tokenEndpoint := getTokenEndpointFromCalendarType(calendarType)
	values := url.Values{
		"client_id":     {clientId},
		"client_secret": {clientSecret},
		"refresh_token": {accountAuth.RefreshToken},
		"scope":         {accountAuth.Scope},
		"grant_type":    {"refresh_token"},
	}

	resp, err := http.PostForm(
		tokenEndpoint,
		values,
	)
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	defer resp.Body.Close()

	var res AccessTokenResponse
	json.NewDecoder(resp.Body).Decode(&res)

	return res
}

type RefreshAccessTokenData struct {
	TokenResponse AccessTokenResponse
	Email         string
	CalendarType  models.CalendarType
	Error         *interface{}
}

func RefreshAccessTokenAsync(email string, accountAuth *models.OAuth2CalendarAuth, calendarType models.CalendarType, c chan RefreshAccessTokenData) {
	// Recover from panics
	defer func() {
		if err := recover(); err != nil {
			c <- RefreshAccessTokenData{Error: &err}
		}
	}()

	tokenResponse := RefreshAccessToken(accountAuth, calendarType)

	c <- RefreshAccessTokenData{tokenResponse, email, calendarType, nil}
}

// If access token has expired, get a new token for the primary account as well as all other calendar accounts, update the user object, and save it to the database
// `accounts` specifies for which accounts to refresh access tokens. If `accounts` is nil or empty, then update tokens for all accounts
func RefreshUserTokenIfNecessary(u *models.User, accounts models.Set[string]) {
	refreshTokenChan := make(chan RefreshAccessTokenData)
	numAccountsToUpdate := 0

	// If `accounts` is nil, then update tokens for all accounts
	updateAllAccounts := len(accounts) == 0

	// Refresh calendar account access tokens if necessary
	for accountKey, account := range u.CalendarAccounts {
		if account.OAuth2CalendarAuth != nil { // Only refresh access tokens for OAuth2 calendar accounts
			accountAuth := account.OAuth2CalendarAuth

			if _, ok := accounts[accountKey]; ok || updateAllAccounts {
				if time.Now().After(accountAuth.AccessTokenExpireDate.Time()) && len(accountAuth.RefreshToken) > 0 {
					go RefreshAccessTokenAsync(account.Email, accountAuth, account.CalendarType, refreshTokenChan)
					numAccountsToUpdate++
				}
			}
		}
	}

	// Update access tokens as responses are received
	for i := 0; i < numAccountsToUpdate; i++ {
		res := <-refreshTokenChan

		if res.Error != nil {
			continue
		}

		accessTokenExpireDate := utils.GetAccessTokenExpireDate(res.TokenResponse.ExpiresIn)

		calendarAccountKey := utils.ActualCalendarAccountMapKey(u, res.Email, res.CalendarType)
		if calendarAccountKey == "" {
			calendarAccountKey = utils.GetCalendarAccountKey(res.Email, res.CalendarType)
		}
		if calendarAccount, ok := u.CalendarAccounts[calendarAccountKey]; ok {
			calendarAccount.OAuth2CalendarAuth.AccessToken = res.TokenResponse.AccessToken
			calendarAccount.OAuth2CalendarAuth.AccessTokenExpireDate = primitive.NewDateTimeFromTime(accessTokenExpireDate)
			u.CalendarAccounts[calendarAccountKey] = calendarAccount
		}
	}

	// Update user object if accounts were updated
	if numAccountsToUpdate > 0 {
		db.UsersCollection.FindOneAndUpdate(
			context.Background(),
			bson.M{"_id": u.Id},
			bson.M{"$set": u},
		)
	}
}

func getCredentialsFromCalendarType(calendarType models.CalendarType) (string, string) {
	if calendarType == models.GoogleCalendarType {
		return os.Getenv("CLIENT_ID"), os.Getenv("CLIENT_SECRET")
	} else if calendarType == models.OutlookCalendarType {
		return os.Getenv("MICROSOFT_CLIENT_ID"), os.Getenv("MICROSOFT_CLIENT_SECRET")
	}

	return "", ""
}

func getTokenEndpointFromCalendarType(calendarType models.CalendarType) string {
	if calendarType == models.GoogleCalendarType {
		return "https://oauth2.googleapis.com/token"
	} else if calendarType == models.OutlookCalendarType {
		return "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	}

	return ""
}
