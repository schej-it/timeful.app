package main

import (
	"context"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/db"
)

// Creates the indexes needed by the organizations (teams) feature.
func main() {
	disconnect := db.Init()
	defer disconnect()

	ctx := context.Background()

	// organizationMembers: unique membership per (userId, organizationId) + lookup by org
	_, err := db.OrganizationMembersCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "organizationId", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetName("member_userId_organizationId_unique"),
		},
		{
			Keys:    bson.D{{Key: "organizationId", Value: 1}},
			Options: options.Index().SetName("member_organizationId_1"),
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Created organizationMembers indexes")

	// organizationInvitations: lookup by email, by org, and by token
	_, err = db.OrganizationInvitationsCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetName("invitation_email_1"),
		},
		{
			Keys:    bson.D{{Key: "organizationId", Value: 1}},
			Options: options.Index().SetName("invitation_organizationId_1"),
		},
		{
			Keys:    bson.D{{Key: "token", Value: 1}},
			Options: options.Index().SetName("invitation_token_1"),
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Created organizationInvitations indexes")

	// events: list org events efficiently
	_, err = db.EventsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "organizationId", Value: 1},
			{Key: "_id", Value: -1},
		},
		Options: options.Index().SetName("organizationId_id_1"),
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Created events organizationId index")

	os.Exit(0)
}
