package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"schej.it/server/db"
	"schej.it/server/errs"
	"schej.it/server/models"
	"schej.it/server/responses"
)

func InitUsers(router *gin.RouterGroup) {
	usersRouter := router.Group("/users")

	usersRouter.GET("/:userId/is-premium", getIsUserPremium)
	// Public profile for invite screens, ads, etc. (no auth). Must be registered
	// after more specific /:userId/... routes.
	usersRouter.GET("/:userId", getPublicUserProfile)
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

// @Summary Returns a minimal public user profile (safe for unauthenticated clients)
// @Tags users
// @Produce json
// @Param userId path string true "User ID"
// @Success 200 {object} models.User
// @Router /users/{userId} [get]
func getPublicUserProfile(c *gin.Context) {
	userId := c.Param("userId")
	user := db.GetUserById(userId)
	if user == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.UserDoesNotExist})
		return
	}

	public := models.User{
		Id:        user.Id,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Picture:   user.Picture,
	}
	c.JSON(http.StatusOK, public)
}
