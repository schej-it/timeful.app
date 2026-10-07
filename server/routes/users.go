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

	// Public profile for invite screens, etc. (no auth)
	usersRouter.GET("/:userId", getPublicUserProfile)
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
