package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"schej.it/server/db"
)

func InitUsers(router *gin.RouterGroup) {
	usersRouter := router.Group("/users")

	usersRouter.GET("/:userId/is-premium", getIsUserPremium)
}

// @Summary Returns whether the given user is a premium user
// @Tags users
// @Produce json
// @Param userId path string true "User ID"
// @Success 200 {object} object{isPremium=bool}
// @Router /users/{userId}/is-premium [get]
func getIsUserPremium(c *gin.Context) {
	userId := c.Param("userId")
	user := db.GetUserById(userId)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"isPremium": false})
		return
	}

	isPremium := false
	if user.StripeCustomerId != nil {
		if user.IsPremium != nil {
			isPremium = *user.IsPremium
		} else {
			isPremium = true
		}
	}

	c.JSON(http.StatusOK, gin.H{"isPremium": isPremium})
}
