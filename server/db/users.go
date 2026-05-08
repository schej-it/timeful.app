package db

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/logger"
	"schej.it/server/models"
)

// Returns a user based on their _id
func GetUserById(userId string) *models.User {
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		// userId is malformatted
		return nil
	}
	result := UsersCollection.FindOne(context.Background(), bson.M{
		"_id": objectId,
	})
	if result.Err() == mongo.ErrNoDocuments {
		// User does not exist!
		return nil
	}

	// Decode result
	var user models.User
	if err := result.Decode(&user); err != nil {
		logger.StdErr.Panicln(err)
	}

	return &user
}

func GetUserByStripeCustomerId(stripeCustomerId string) *models.User {
	result := UsersCollection.FindOne(context.Background(), bson.M{
		"stripeCustomerId": stripeCustomerId,
	})

	if result.Err() == mongo.ErrNoDocuments {
		// User does not exist!
		return nil
	}

	// Decode result
	var user models.User
	if err := result.Decode(&user); err != nil {
		logger.StdErr.Panicln(err)
	}

	return &user
}

func GetUserByEmail(email string) *models.User {
	emailQuery := strings.TrimSpace(email)
	if emailQuery == "" {
		return nil
	}
	opts := options.FindOne().SetCollation(&options.Collation{
		Locale:   "en",
		Strength: 2, // case-insensitive match on email
	})
	result := UsersCollection.FindOne(context.Background(), bson.M{
		"email": emailQuery,
	}, opts)
	if result.Err() == mongo.ErrNoDocuments {
		// User does not exist!
		return nil
	}

	// Decode result
	var user models.User
	if err := result.Decode(&user); err != nil {
		logger.StdErr.Panicln(err)
	}

	return &user
}
