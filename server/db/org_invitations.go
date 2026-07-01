package db

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/logger"
	"schej.it/server/models"
)

func CreateOrgInvitation(invitation *models.OrganizationInvitation) (primitive.ObjectID, error) {
	result, err := OrganizationInvitationsCollection.InsertOne(context.Background(), invitation)
	if err != nil {
		return primitive.NilObjectID, err
	}
	return result.InsertedID.(primitive.ObjectID), nil
}

func GetOrgInvitationById(invitationId primitive.ObjectID) *models.OrganizationInvitation {
	var invitation models.OrganizationInvitation
	err := OrganizationInvitationsCollection.FindOne(context.Background(), bson.M{"_id": invitationId}).Decode(&invitation)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return &invitation
}

// GetOrgInvitation returns a pending invitation for the given org + email (case-insensitive), or nil.
func GetOrgInvitation(orgId primitive.ObjectID, email string) *models.OrganizationInvitation {
	opts := options.FindOne().SetCollation(&options.Collation{Locale: "en", Strength: 2})
	var invitation models.OrganizationInvitation
	err := OrganizationInvitationsCollection.FindOne(context.Background(), bson.M{
		"organizationId": orgId,
		"email":          email,
	}, opts).Decode(&invitation)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		logger.StdErr.Panicln(err)
	}
	return &invitation
}

// GetOrgInvitationsForOrg returns all pending invitations for an org.
func GetOrgInvitationsForOrg(orgId primitive.ObjectID) ([]models.OrganizationInvitation, error) {
	ctx := context.Background()
	cursor, err := OrganizationInvitationsCollection.Find(ctx, bson.M{"organizationId": orgId})
	if err != nil {
		return nil, err
	}
	var invitations []models.OrganizationInvitation
	if err = cursor.All(ctx, &invitations); err != nil {
		return nil, err
	}
	return invitations, nil
}

// GetOrgInvitationsForEmail returns all pending invitations matching the given email
// (case-insensitive), with Organization populated.
func GetOrgInvitationsForEmail(email string) ([]models.OrganizationInvitation, error) {
	ctx := context.Background()
	opts := options.Find().SetCollation(&options.Collation{Locale: "en", Strength: 2})
	cursor, err := OrganizationInvitationsCollection.Find(ctx, bson.M{"email": email}, opts)
	if err != nil {
		return nil, err
	}
	var invitations []models.OrganizationInvitation
	if err = cursor.All(ctx, &invitations); err != nil {
		return nil, err
	}
	for i := range invitations {
		invitations[i].Organization = GetOrgById(invitations[i].OrganizationId)
	}
	return invitations, nil
}

func DeleteOrgInvitation(invitationId primitive.ObjectID) error {
	_, err := OrganizationInvitationsCollection.DeleteOne(context.Background(), bson.M{"_id": invitationId})
	return err
}
