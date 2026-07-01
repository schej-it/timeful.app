/* The /organizations group contains routes to create and manage organizations (teams) */
package routes

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"schej.it/server/db"
	"schej.it/server/errs"
	"schej.it/server/middleware"
	"schej.it/server/models"
	"schej.it/server/responses"
	"schej.it/server/services/listmonk"
	"schej.it/server/utils"
)

// orgInviteTemplateId returns the Listmonk transactional template id for organization
// invitation emails, configurable via LISTMONK_ORG_INVITE_TEMPLATE_ID (defaults to 10).
func orgInviteTemplateId() int {
	if v, err := strconv.Atoi(os.Getenv("LISTMONK_ORG_INVITE_TEMPLATE_ID")); err == nil {
		return v
	}
	return 10
}

func InitOrganizations(router *gin.RouterGroup) {
	r := router.Group("/organizations")
	r.Use(middleware.AuthRequired())

	r.POST("", createOrganization)
	r.GET("", listMyOrganizations)
	r.GET("/:orgId", getOrganization)
	r.PATCH("/:orgId", updateOrganization)
	r.DELETE("/:orgId", deleteOrganization)

	r.GET("/:orgId/members", listMembers)
	r.DELETE("/:orgId/members/:userId", removeMember)
	r.PATCH("/:orgId/members/:userId", changeMemberRole)
	r.POST("/:orgId/leave", leaveOrganization)

	r.GET("/:orgId/invitations", listInvitations)
	r.POST("/:orgId/invitations", inviteMember)
	r.DELETE("/:orgId/invitations/:invId", revokeInvitation)

	// Stripe per-seat billing (defined in stripe.go)
	r.POST("/:orgId/checkout-session", createTeamCheckoutSession)
	r.GET("/:orgId/billing-portal", getOrgBillingPortalUrl)
}

func InitOrgInvitations(router *gin.RouterGroup) {
	r := router.Group("/org-invitations")
	r.Use(middleware.AuthRequired())

	r.GET("", listMyInvitations)
	r.POST("/:invId/accept", acceptInvitation)
	r.POST("/:invId/decline", declineInvitation)
}

// --- helpers ---

// getOrgFromParam parses the :orgId path param and loads the org, writing an error
// response and returning false if not found.
func getOrgFromParam(c *gin.Context) (*models.Organization, bool) {
	orgId, err := primitive.ObjectIDFromHex(c.Param("orgId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.OrganizationNotFound})
		return nil, false
	}
	org := db.GetOrgById(orgId)
	if org == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.OrganizationNotFound})
		return nil, false
	}
	return org, true
}

// requireOrgRole verifies the authed user is a member of the org with at least minRole.
// Returns the membership and true on success; otherwise writes an error and returns false.
func requireOrgRole(c *gin.Context, org *models.Organization, minRole models.OrgRole) (*models.OrganizationMember, bool) {
	user := utils.GetAuthUser(c)
	member := db.GetOrgMember(user.Id, org.Id)
	if member == nil {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.UserNotInOrganization})
		return nil, false
	}
	if member.Role.RoleRank() < minRole.RoleRank() {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InsufficientOrgPermission})
		return nil, false
	}
	return member, true
}

func generateInviteToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand should never fail; fall back to a timestamp-based token
		return hex.EncodeToString([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	}
	return hex.EncodeToString(b)
}

func nowDateTime() primitive.DateTime {
	return primitive.NewDateTimeFromTime(time.Now())
}

// populateOrg fills in members, member count, and the requesting user's role.
func populateOrg(org *models.Organization, userId primitive.ObjectID) {
	members, err := db.GetOrgMembers(org.Id)
	if err == nil {
		for i := range members {
			stripSensitiveUserFields(members[i].User)
		}
		org.Members = members
		org.MemberCount = len(members)
	}
	if m := db.GetOrgMember(userId, org.Id); m != nil {
		org.MyRole = m.Role
	}
}

// --- handlers ---

// @Summary Create a new organization
// @Tags organizations
// @Accept json
// @Produce json
// @Param payload body object{name=string} true "Organization name"
// @Success 201 {object} models.Organization
// @Router /organizations [post]
func createOrganization(c *gin.Context) {
	var body struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := utils.GetAuthUser(c)
	org := models.Organization{
		Name:               body.Name,
		OwnerId:            user.Id,
		CreatedAt:          nowDateTime(),
		SeatCount:          1,
		SubscriptionStatus: models.OrgSubNone,
	}
	orgId, err := db.CreateOrg(&org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization"})
		return
	}
	org.Id = orgId

	// Add the creator as the owner member
	if err := db.AddOrgMember(&models.OrganizationMember{
		OrganizationId: orgId,
		UserId:         user.Id,
		Role:           models.OrgRoleOwner,
		CreatedAt:      nowDateTime(),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization membership"})
		return
	}

	org.MyRole = models.OrgRoleOwner
	org.MemberCount = 1
	c.JSON(http.StatusCreated, org)
}

// @Summary List the organizations the current user belongs to
// @Tags organizations
// @Produce json
// @Success 200 {array} models.Organization
// @Router /organizations [get]
func listMyOrganizations(c *gin.Context) {
	user := utils.GetAuthUser(c)
	orgs, err := db.GetOrganizationsForUser(user.Id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get organizations"})
		return
	}
	c.JSON(http.StatusOK, orgs)
}

// @Summary Get an organization with its members
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Success 200 {object} models.Organization
// @Router /organizations/{orgId} [get]
func getOrganization(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleMember); !ok {
		return
	}
	user := utils.GetAuthUser(c)
	populateOrg(org, user.Id)
	c.JSON(http.StatusOK, org)
}

// @Summary Rename an organization
// @Tags organizations
// @Accept json
// @Produce json
// @Param orgId path string true "Organization ID"
// @Param payload body object{name=string} true "New organization name"
// @Success 200
// @Router /organizations/{orgId} [patch]
func updateOrganization(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleAdmin); !ok {
		return
	}
	var body struct {
		Name *string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := bson.M{}
	if body.Name != nil {
		updates["name"] = *body.Name
	}
	if len(updates) > 0 {
		if err := db.UpdateOrg(org.Id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization"})
			return
		}
	}
	c.Status(http.StatusOK)
}

// @Summary Delete an organization
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Success 200
// @Router /organizations/{orgId} [delete]
func deleteOrganization(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleOwner); !ok {
		return
	}
	// Cancel the Stripe subscription (best-effort), then soft-delete the org
	cancelOrgSubscription(org)
	if err := db.DeleteOrg(org.Id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete organization"})
		return
	}
	c.Status(http.StatusOK)
}

// @Summary List members of an organization
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Success 200 {array} models.OrganizationMember
// @Router /organizations/{orgId}/members [get]
func listMembers(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleMember); !ok {
		return
	}
	members, err := db.GetOrgMembers(org.Id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get members"})
		return
	}
	for i := range members {
		stripSensitiveUserFields(members[i].User)
	}
	c.JSON(http.StatusOK, members)
}

// @Summary Remove a member from an organization
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Param userId path string true "User ID to remove"
// @Success 200
// @Router /organizations/{orgId}/members/{userId} [delete]
func removeMember(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	caller, ok := requireOrgRole(c, org, models.OrgRoleAdmin)
	if !ok {
		return
	}
	targetUserId, err := primitive.ObjectIDFromHex(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.UserDoesNotExist})
		return
	}
	target := db.GetOrgMember(targetUserId, org.Id)
	if target == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.UserNotInOrganization})
		return
	}
	// The owner can never be removed
	if target.Role == models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.CannotModifyOwner})
		return
	}
	// An admin cannot remove another admin; only the owner can
	if target.Role == models.OrgRoleAdmin && caller.Role != models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InsufficientOrgPermission})
		return
	}
	if err := db.RemoveOrgMember(targetUserId, org.Id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}
	syncOrgSeats(org)
	c.Status(http.StatusOK)
}

// @Summary Change a member's role
// @Tags organizations
// @Accept json
// @Produce json
// @Param orgId path string true "Organization ID"
// @Param userId path string true "User ID"
// @Param payload body object{role=string} true "New role (admin or member)"
// @Success 200
// @Router /organizations/{orgId}/members/{userId} [patch]
func changeMemberRole(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	caller, ok := requireOrgRole(c, org, models.OrgRoleAdmin)
	if !ok {
		return
	}
	var body struct {
		Role models.OrgRole `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Only member <-> admin transitions are allowed. Transferring ownership is not
	// supported through this endpoint.
	if body.Role != models.OrgRoleAdmin && body.Role != models.OrgRoleMember {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.CannotModifyOwner})
		return
	}
	targetUserId, err := primitive.ObjectIDFromHex(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.UserDoesNotExist})
		return
	}
	target := db.GetOrgMember(targetUserId, org.Id)
	if target == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.UserNotInOrganization})
		return
	}
	// The owner's role can never be changed here
	if target.Role == models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.CannotModifyOwner})
		return
	}
	// Only the owner may demote/promote admins
	if target.Role == models.OrgRoleAdmin && caller.Role != models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InsufficientOrgPermission})
		return
	}
	if err := db.UpdateOrgMemberRole(targetUserId, org.Id, body.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update member role"})
		return
	}
	c.Status(http.StatusOK)
}

// @Summary Leave an organization
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Success 200
// @Router /organizations/{orgId}/leave [post]
func leaveOrganization(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	member, ok := requireOrgRole(c, org, models.OrgRoleMember)
	if !ok {
		return
	}
	// The owner cannot leave; they must delete the org instead
	if member.Role == models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.OwnerCannotLeave})
		return
	}
	user := utils.GetAuthUser(c)
	if err := db.RemoveOrgMember(user.Id, org.Id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave organization"})
		return
	}
	syncOrgSeats(org)
	c.Status(http.StatusOK)
}

// @Summary List pending invitations for an organization
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Success 200 {array} models.OrganizationInvitation
// @Router /organizations/{orgId}/invitations [get]
func listInvitations(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleAdmin); !ok {
		return
	}
	invitations, err := db.GetOrgInvitationsForOrg(org.Id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invitations"})
		return
	}
	c.JSON(http.StatusOK, invitations)
}

// @Summary Invite a member to an organization by email
// @Tags organizations
// @Accept json
// @Produce json
// @Param orgId path string true "Organization ID"
// @Param payload body object{email=string,role=string} true "Invitee email and role"
// @Success 201 {object} models.OrganizationInvitation
// @Router /organizations/{orgId}/invitations [post]
func inviteMember(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	caller, ok := requireOrgRole(c, org, models.OrgRoleAdmin)
	if !ok {
		return
	}
	var body struct {
		Email string         `json:"email" binding:"required"`
		Role  models.OrgRole `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Default role is member; only the owner may invite admins
	role := body.Role
	if role == "" {
		role = models.OrgRoleMember
	}
	if role != models.OrgRoleMember && role != models.OrgRoleAdmin {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.CannotModifyOwner})
		return
	}
	if role == models.OrgRoleAdmin && caller.Role != models.OrgRoleOwner {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InsufficientOrgPermission})
		return
	}

	email := utils.NormalizeEmail(body.Email)

	// Reject if the invitee is already a member
	if existingUser := db.GetUserByEmail(email); existingUser != nil {
		if db.IsOrgMember(existingUser.Id, org.Id) {
			c.JSON(http.StatusConflict, responses.Error{Error: errs.AlreadyOrgMember})
			return
		}
	}
	// Reject if there's already a pending invitation
	if db.GetOrgInvitation(org.Id, email) != nil {
		c.JSON(http.StatusConflict, responses.Error{Error: errs.AlreadyInvited})
		return
	}

	invitation := models.OrganizationInvitation{
		OrganizationId: org.Id,
		Email:          email,
		Role:           role,
		InvitedBy:      caller.UserId,
		Token:          generateInviteToken(),
		CreatedAt:      nowDateTime(),
	}
	invId, err := db.CreateOrgInvitation(&invitation)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invitation"})
		return
	}
	invitation.Id = invId

	// Bump the Stripe seat quantity (auto-increase + prorated charge) now that a seat
	// is reserved for this invitation.
	syncOrgSeats(org)

	// Send the invitation email
	inviter := utils.GetAuthUser(c)
	listmonk.SendEmailAddSubscriberIfNotExist(email, orgInviteTemplateId(), bson.M{
		"orgName":     org.Name,
		"inviterName": inviter.FirstName,
		"inviteUrl":   fmt.Sprintf("%s/org-invite/%s", utils.GetBaseUrl(), invitation.Token),
	}, false, "Timeful <noreply@timeful.app>")

	c.JSON(http.StatusCreated, invitation)
}

// @Summary Revoke a pending invitation
// @Tags organizations
// @Produce json
// @Param orgId path string true "Organization ID"
// @Param invId path string true "Invitation ID"
// @Success 200
// @Router /organizations/{orgId}/invitations/{invId} [delete]
func revokeInvitation(c *gin.Context) {
	org, ok := getOrgFromParam(c)
	if !ok {
		return
	}
	if _, ok := requireOrgRole(c, org, models.OrgRoleAdmin); !ok {
		return
	}
	invId, err := primitive.ObjectIDFromHex(c.Param("invId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	invitation := db.GetOrgInvitationById(invId)
	if invitation == nil || invitation.OrganizationId != org.Id {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	if err := db.DeleteOrgInvitation(invId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke invitation"})
		return
	}
	syncOrgSeats(org)
	c.Status(http.StatusOK)
}

// --- invitee-facing handlers (/org-invitations) ---

// @Summary List the current user's pending organization invitations
// @Tags organizations
// @Produce json
// @Success 200 {array} models.OrganizationInvitation
// @Router /org-invitations [get]
func listMyInvitations(c *gin.Context) {
	user := utils.GetAuthUser(c)
	invitations, err := db.GetOrgInvitationsForEmail(user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invitations"})
		return
	}
	c.JSON(http.StatusOK, invitations)
}

// @Summary Accept an organization invitation
// @Tags organizations
// @Produce json
// @Param invId path string true "Invitation ID"
// @Success 200 {object} models.Organization
// @Router /org-invitations/{invId}/accept [post]
func acceptInvitation(c *gin.Context) {
	user := utils.GetAuthUser(c)
	invId, err := primitive.ObjectIDFromHex(c.Param("invId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	invitation := db.GetOrgInvitationById(invId)
	if invitation == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	// The invitation must be addressed to the authenticated user's email
	if utils.NormalizeEmail(invitation.Email) != utils.NormalizeEmail(user.Email) {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InvitationNotFound})
		return
	}

	org := db.GetOrgById(invitation.OrganizationId)
	if org == nil {
		// Org was deleted; clean up the stale invitation
		db.DeleteOrgInvitation(invId)
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.OrganizationNotFound})
		return
	}

	// Add the membership (seat count is unchanged: the invitation already reserved a seat)
	if !db.IsOrgMember(user.Id, org.Id) {
		if err := db.AddOrgMember(&models.OrganizationMember{
			OrganizationId: org.Id,
			UserId:         user.Id,
			Role:           invitation.Role,
			CreatedAt:      nowDateTime(),
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join organization"})
			return
		}
	}
	db.DeleteOrgInvitation(invId)
	// Keep the Stripe quantity consistent (members + pending invitations)
	syncOrgSeats(org)

	populateOrg(org, user.Id)
	c.JSON(http.StatusOK, org)
}

// @Summary Decline an organization invitation
// @Tags organizations
// @Produce json
// @Param invId path string true "Invitation ID"
// @Success 200
// @Router /org-invitations/{invId}/decline [post]
func declineInvitation(c *gin.Context) {
	user := utils.GetAuthUser(c)
	invId, err := primitive.ObjectIDFromHex(c.Param("invId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	invitation := db.GetOrgInvitationById(invId)
	if invitation == nil {
		c.JSON(http.StatusNotFound, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	if utils.NormalizeEmail(invitation.Email) != utils.NormalizeEmail(user.Email) {
		c.JSON(http.StatusForbidden, responses.Error{Error: errs.InvitationNotFound})
		return
	}
	org := db.GetOrgById(invitation.OrganizationId)
	if err := db.DeleteOrgInvitation(invId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decline invitation"})
		return
	}
	if org != nil {
		syncOrgSeats(org)
	}
	c.Status(http.StatusOK)
}
