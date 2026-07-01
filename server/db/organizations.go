package db

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"schej.it/server/logger"
	"schej.it/server/models"
)

// notDeleted matches docs that are not soft-deleted
var notDeleted = bson.A{
	bson.M{"isDeleted": bson.M{"$exists": false}},
	bson.M{"isDeleted": false},
}

func CreateOrg(org *models.Organization) (primitive.ObjectID, error) {
	result, err := OrganizationsCollection.InsertOne(context.Background(), org)
	if err != nil {
		return primitive.NilObjectID, err
	}
	return result.InsertedID.(primitive.ObjectID), nil
}

func GetOrgById(orgId primitive.ObjectID) *models.Organization {
	var org models.Organization
	err := OrganizationsCollection.FindOne(context.Background(), bson.M{
		"_id": orgId,
		"$or": notDeleted,
	}).Decode(&org)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return &org
}

func GetOrgByStripeCustomerId(stripeCustomerId string) *models.Organization {
	var org models.Organization
	err := OrganizationsCollection.FindOne(context.Background(), bson.M{
		"stripeCustomerId": stripeCustomerId,
	}).Decode(&org)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return &org
}

func UpdateOrg(orgId primitive.ObjectID, updates bson.M) error {
	_, err := OrganizationsCollection.UpdateOne(context.Background(), bson.M{"_id": orgId}, bson.M{"$set": updates})
	return err
}

// DeleteOrg soft-deletes the org, removes memberships + pending invitations, and
// soft-deletes the org's events.
func DeleteOrg(orgId primitive.ObjectID) error {
	ctx := context.Background()
	if _, err := OrganizationsCollection.UpdateOne(ctx, bson.M{"_id": orgId}, bson.M{"$set": bson.M{"isDeleted": true}}); err != nil {
		return err
	}
	if _, err := OrganizationMembersCollection.DeleteMany(ctx, bson.M{"organizationId": orgId}); err != nil {
		return err
	}
	if _, err := OrganizationInvitationsCollection.DeleteMany(ctx, bson.M{"organizationId": orgId}); err != nil {
		return err
	}
	if _, err := EventsCollection.UpdateMany(ctx, bson.M{"organizationId": orgId}, bson.M{"$set": bson.M{"isDeleted": true}}); err != nil {
		return err
	}
	return nil
}

// --- Membership ---

func AddOrgMember(member *models.OrganizationMember) error {
	_, err := OrganizationMembersCollection.InsertOne(context.Background(), member)
	return err
}

func GetOrgMember(userId primitive.ObjectID, orgId primitive.ObjectID) *models.OrganizationMember {
	var member models.OrganizationMember
	err := OrganizationMembersCollection.FindOne(context.Background(), bson.M{
		"userId":         userId,
		"organizationId": orgId,
	}).Decode(&member)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return &member
}

func IsOrgMember(userId primitive.ObjectID, orgId primitive.ObjectID) bool {
	count, err := OrganizationMembersCollection.CountDocuments(context.Background(), bson.M{
		"userId":         userId,
		"organizationId": orgId,
	})
	if err != nil {
		logger.StdErr.Println(err)
		return false
	}
	return count > 0
}

// GetOrgMembers returns the members of an org with their User populated.
func GetOrgMembers(orgId primitive.ObjectID) ([]models.OrganizationMember, error) {
	ctx := context.Background()
	cursor, err := OrganizationMembersCollection.Find(ctx, bson.M{"organizationId": orgId})
	if err != nil {
		return nil, err
	}
	var members []models.OrganizationMember
	if err = cursor.All(ctx, &members); err != nil {
		return nil, err
	}
	for i := range members {
		user := GetUserById(members[i].UserId.Hex())
		members[i].User = user
	}
	return members, nil
}

// GetOrganizationsForUser returns all orgs the user is a member of, with MyRole and
// MemberCount populated.
func GetOrganizationsForUser(userId primitive.ObjectID) ([]models.Organization, error) {
	ctx := context.Background()
	cursor, err := OrganizationMembersCollection.Find(ctx, bson.M{"userId": userId})
	if err != nil {
		return nil, err
	}
	var memberships []models.OrganizationMember
	if err = cursor.All(ctx, &memberships); err != nil {
		return nil, err
	}

	orgs := make([]models.Organization, 0, len(memberships))
	for _, m := range memberships {
		org := GetOrgById(m.OrganizationId)
		if org == nil {
			continue
		}
		org.MyRole = m.Role
		count, _ := OrganizationMembersCollection.CountDocuments(ctx, bson.M{"organizationId": org.Id})
		org.MemberCount = int(count)
		orgs = append(orgs, *org)
	}
	return orgs, nil
}

func RemoveOrgMember(userId primitive.ObjectID, orgId primitive.ObjectID) error {
	_, err := OrganizationMembersCollection.DeleteOne(context.Background(), bson.M{
		"userId":         userId,
		"organizationId": orgId,
	})
	return err
}

func UpdateOrgMemberRole(userId primitive.ObjectID, orgId primitive.ObjectID, role models.OrgRole) error {
	_, err := OrganizationMembersCollection.UpdateOne(context.Background(), bson.M{
		"userId":         userId,
		"organizationId": orgId,
	}, bson.M{"$set": bson.M{"role": role}})
	return err
}

// CountOrgSeatsInUse returns the number of seats consumed = members + pending invitations.
func CountOrgSeatsInUse(orgId primitive.ObjectID) int {
	ctx := context.Background()
	members, err := OrganizationMembersCollection.CountDocuments(ctx, bson.M{"organizationId": orgId})
	if err != nil {
		logger.StdErr.Println(err)
		return 0
	}
	invites, err := OrganizationInvitationsCollection.CountDocuments(ctx, bson.M{"organizationId": orgId})
	if err != nil {
		logger.StdErr.Println(err)
		return 0
	}
	return int(members + invites)
}
