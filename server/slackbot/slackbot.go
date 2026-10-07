package slackbot

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"regexp"

	"github.com/gin-gonic/gin"
	"schej.it/server/slackbot/commands"
	"schej.it/server/utils"
)

type SlackbotMessageType string

const (
	GENERAL SlackbotMessageType = "general"
)

func SendTextMessage(message string) {
	SendTextMessageWithType(message, GENERAL)
}

func SendTextMessageWithType(message string, messageType SlackbotMessageType) {
	SendMessageWithType(&commands.Response{Text: message}, messageType)
}

func SendMessage(message *commands.Response) {
	SendMessageWithType(message, GENERAL)
}

func SendMessageWithType(message *commands.Response, messageType SlackbotMessageType) {
	var webhookUrl string
	if utils.IsRelease() {
		switch messageType {
		case GENERAL:
			// schej-bot
			webhookUrl = os.Getenv("SLACK_PROD_WEBHOOK_URL")
		}
	} else {
		// schej-bot-dev
		webhookUrl = os.Getenv("SLACK_DEV_WEBHOOK_URL")
	}

	commands.SendRawMessage(message, webhookUrl)
}

func InitSlackbot(router *gin.RouterGroup) {
	slackbotRouter := router.Group("/slackbot")

	slackbotRouter.POST("", execCommand)
}

// @Summary Gets the number of signed up users
// @Tags slackbot
// @Accept x-www-form-urlencoded
// @Produce json
// @Success 200 {object} commands.Response "Text response"
// @Router /slackbot [post]
func execCommand(c *gin.Context) {
	payload := struct {
		Command     string `form:"command" binding:"required"`
		Text        string `form:"text"`
		ResponseUrl string `form:"response_url" binding:"required"`
	}{}
	if err := c.Bind(&payload); err != nil {
		return
	}

	decodedText, err := url.QueryUnescape(payload.Text)
	if err != nil {
		c.JSON(http.StatusOK, commands.Response{ResponseType: "ephemeral", Text: fmt.Sprintf("Command failed: %v", err)})
		return
	}

	args := make([]string, 0)
	r := regexp.MustCompile(`([^\s"']+)|"([^"]*)"|'([^']*)'`)
	matches := r.FindAllStringSubmatch(decodedText, -1)
	for _, match := range matches {
		for _, el := range match[1:] {
			if len(el) > 0 {
				args = append(args, el)
			}
		}
	}

	command, ok := commands.CommandMap[payload.Command]
	if !ok {
		c.JSON(http.StatusOK, commands.Response{ResponseType: "ephemeral", Text: fmt.Sprintf("Command does not exist: %s", payload.Command)})
		return
	}

	if len(args) > 0 && args[0] == "help" {
		c.JSON(http.StatusOK, commands.Response{ResponseType: "ephemeral", Text: command.Description})
		return
	}

	go command.Execute(args, payload.ResponseUrl)

	c.Status(http.StatusOK)
}
