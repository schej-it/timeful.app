package listmonk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"go.mongodb.org/mongo-driver/bson"
	"schej.it/server/logger"
)

// Adds the given user to the Listmonk contact list
// If subscriberId is not nil, then UPDATE the user instead of adding user
func AddUserToListmonk(email string, firstName string, lastName string, picture string, subscriberId *int, sendMarketingEmails bool) {
	if os.Getenv("LISTMONK_ENABLED") == "false" {
		return
	}

	url := os.Getenv("LISTMONK_URL")
	username := os.Getenv("LISTMONK_USERNAME")
	password := os.Getenv("LISTMONK_PASSWORD")
	listIdString := os.Getenv("LISTMONK_LIST_ID")

	listId, err := strconv.Atoi(listIdString)
	if err != nil {
		logger.StdErr.Println(err)
		return
	}

	// Create new subscriber
	args := bson.M{
		"email":  email,
		"name":   firstName + " " + lastName,
		"status": "enabled",
		"attribs": bson.M{
			"firstName": firstName,
			"lastName":  lastName,
			"picture":   picture,
		},
		"preconfirm_subscriptions": true,
	}
	if sendMarketingEmails {
		args["lists"] = bson.A{listId}
	}
	body, _ := json.Marshal(args)
	bodyBuffer := bytes.NewBuffer(body)

	var req *http.Request
	if subscriberId != nil {
		// Existing subscriber
		req, _ = http.NewRequest("PUT", fmt.Sprintf("%s/api/subscribers/%d", url, *subscriberId), bodyBuffer)
	} else {
		// New subscriber
		req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/subscribers", url), bodyBuffer)
	}
	req.SetBasicAuth(username, password)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.StdErr.Println(err)
		return
	}
	defer resp.Body.Close()
}

// Check if the user is already in listmonk
// Returns a bool representing whether the subscriber exists and the id of the subscriber if it does exist
func DoesUserExist(email string) (bool, *int) {
	if os.Getenv("LISTMONK_ENABLED") == "false" {
		return false, nil
	}

	url := os.Getenv("LISTMONK_URL")
	username := os.Getenv("LISTMONK_USERNAME")
	password := os.Getenv("LISTMONK_PASSWORD")

	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/subscribers?query=subscribers.email='%s'", url, email), nil)
	req.SetBasicAuth(username, password)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.StdErr.Println(err)
		return false, nil
	}
	defer resp.Body.Close()

	var response struct {
		Data struct {
			Results []struct {
				Id int `json:"id"`
			} `json:"results"`
		} `json:"data"`
	}
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.StdErr.Println(err)
		return false, nil
	}

	if len(response.Data.Results) > 0 {
		return true, &response.Data.Results[0].Id
	} else {
		return false, nil
	}
}

// Send a transactional email using the specified template and data.
// fromEmail is optional; if non-empty, overrides the default sender address.
func SendEmail(email string, templateId int, data bson.M, fromEmail ...string) {
	if os.Getenv("LISTMONK_ENABLED") == "false" {
		return
	}

	// Get listmonk url env vars
	listmonkUrl := os.Getenv("LISTMONK_URL")
	listmonkUsername := os.Getenv("LISTMONK_USERNAME")
	listmonkPassword := os.Getenv("LISTMONK_PASSWORD")

	// Construct body
	payload := bson.M{
		"subscriber_email": email,
		"template_id":      templateId,
		"data":             data,
		"content_type":     "html",
	}
	if len(fromEmail) > 0 && fromEmail[0] != "" {
		payload["from_email"] = fromEmail[0]
	}
	body, err := json.Marshal(payload)
	if err != nil {
		logger.StdErr.Println(err)
		return
	}

	// Construct request
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/tx", listmonkUrl), bytes.NewBuffer(body))
	req.SetBasicAuth(listmonkUsername, listmonkPassword)
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.StdErr.Println(err)
	}
	defer response.Body.Close()
}

// Send a transactional email using the specified template and data. Adds subscriber if they don't exist
func SendEmailAddSubscriberIfNotExist(email string, templateId int, data bson.M, sendMarketingEmails bool, fromEmail ...string) {
	if os.Getenv("LISTMONK_ENABLED") == "false" {
		return
	}

	if exists, _ := DoesUserExist(email); !exists {
		AddUserToListmonk(email, "", "", "", nil, sendMarketingEmails)
	}

	SendEmail(email, templateId, data, fromEmail...)
}
