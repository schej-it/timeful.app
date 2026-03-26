package utils

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/brianvoe/sjwt"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/logger"
	"schej.it/server/models"
)

// Returns whether running on production server
func IsRelease() bool {
	mode := os.Getenv("GIN_MODE")
	return mode == "release"
}

func PrintJson(s interface{}) {
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	fmt.Println(string(data))
}

func ParseJWT(jwt string) sjwt.Claims {
	claims, err := sjwt.Parse(jwt)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	return claims
}

func StringToObjectID(s string) primitive.ObjectID {
	objectID, err := primitive.ObjectIDFromHex(s)
	if err != nil {
		logger.StdErr.Panicln(err)
	}

	return objectID
}

// Returns the currently signed in user
func GetAuthUser(c *gin.Context) *models.User {
	userInterface, _ := c.Get("authUser")
	user := userInterface.(*models.User)
	return user
}

// Gets the access token expire date from an "expiresIn" int representing the number of seconds
// after which the access token will expire
func GetAccessTokenExpireDate(expiresIn int) time.Time {
	expireDuration, err := time.ParseDuration(fmt.Sprintf("%ds", expiresIn))
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return time.Now().Add(expireDuration)
}

// Returns the ISO date string for the given date
func GetDateString(date time.Time) string {
	s, _ := date.UTC().MarshalText()
	return string(s)[:10]
}

// Returns a time object with the given date and a time string in the form of "00:00:00"
func GetDateAtTime(date time.Time, timeString string) time.Time {
	utcDateString := GetDateString(date)
	newDate, err := time.Parse(time.RFC3339, fmt.Sprintf("%sT%sZ", utcDateString, timeString))
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return newDate
}

// Escapes regex for a string
func EscapeRegExp(str string) string {
	check := regexp.MustCompile(`([.*+?^${}()|[\]\\])`)
	return check.ReplaceAllString(str, "\\${1}")
}

// Returns the correct client id given the token origin
func GetClientIdFromTokenOrigin(tokenOrigin models.TokenOriginType) string {
	switch tokenOrigin {
	case models.ANDROID:
		return os.Getenv("ANDROID_CLIENT_ID")
	case models.IOS:
		return os.Getenv("IOS_CLIENT_ID")
	default:
		return os.Getenv("CLIENT_ID")
	}
}

// Prints the http response as a string
func PrintHttpResponse(resp *http.Response) {
	body, _ := io.ReadAll(resp.Body)
	logger.StdOut.Println(string(body))
	resp.Body = io.NopCloser(bytes.NewBuffer(body))
}

// Returns the correct base url, based on whether we're on dev or prod
func GetBaseUrl() string {
	var baseUrl string
	if IsRelease() {
		baseUrl = "https://timeful.app"
	} else {
		baseUrl = "http://localhost:8080"
	}
	return baseUrl
}

// Returns the value of the first non nil pointer in `args`.
// Otherwise, just return the zero value
func Coalesce[T any](args ...*T) T {
	for _, val := range args {
		if val != nil {
			return *val
		}
	}

	var val T
	return val
}

// Return a pointer to true
func TruePtr() *bool {
	b := true
	return &b
}

// Return a pointer to false
func FalsePtr() *bool {
	b := false
	return &b
}

func GetCalendarAccountKey(email string, calendarType models.CalendarType) string {
	return fmt.Sprintf("%s_%s", email, calendarType)
}

func GetPrimaryAccountKey(user *models.User) string {
	// Before primary account key was added, primary account was always the user's google calendar
	if user.PrimaryAccountKey == nil {
		return GetCalendarAccountKey(user.Email, models.GoogleCalendarType)
	}

	return *user.PrimaryAccountKey
}

func Encode(b []byte) string {
	return base64.StdEncoding.EncodeToString(b)
}

func Decode(s string) []byte {
	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return data
}

// Encrypts the given text using the given secret
func Encrypt(text string) (string, error) {
	block, err := aes.NewCipher([]byte(os.Getenv("ENCRYPTION_KEY")))
	if err != nil {
		return "", err
	}
	plainText := []byte(text)
	cipherText := make([]byte, aes.BlockSize+len(plainText))
	iv := cipherText[:aes.BlockSize]
	if _, err := rand.Read(iv); err != nil {
		return "", err
	}
	cfb := cipher.NewCFBEncrypter(block, iv)
	cfb.XORKeyStream(cipherText[aes.BlockSize:], plainText)
	return Encode(cipherText), nil
}

// Decrypts the given text using the given secret
func Decrypt(text string) (string, error) {
	block, err := aes.NewCipher([]byte(os.Getenv("ENCRYPTION_KEY")))
	if err != nil {
		return "", err
	}
	cipherText := Decode(text)
	if len(cipherText) < aes.BlockSize {
		return "", errors.New("ciphertext too short")
	}
	iv := cipherText[:aes.BlockSize]
	cipherText = cipherText[aes.BlockSize:]
	cfb := cipher.NewCFBDecrypter(block, iv)
	plainText := make([]byte, len(cipherText))
	cfb.XORKeyStream(plainText, cipherText)
	return string(plainText), nil
}

// ConvertEventToOldFormat converts an event's responses from ResponsesList to ResponsesMap format
// for backward compatibility with older code
func ConvertEventToOldFormat(event *models.Event, eventResponses []models.EventResponse) {
	responsesMap := make(map[string]*models.Response)
	for _, resp := range eventResponses {
		responsesMap[resp.UserId] = resp.Response
	}
	event.ResponsesMap = responsesMap
}
