package db

import (
	"context"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"schej.it/server/logger"
)

var Client *mongo.Client
var Db *mongo.Database
var EventsCollection *mongo.Collection
var UsersCollection *mongo.Collection
var DailyUserLogCollection *mongo.Collection
var FriendRequestsCollection *mongo.Collection
var EventResponsesCollection *mongo.Collection
var AttendeesCollection *mongo.Collection
var FoldersCollection *mongo.Collection
var FolderEventsCollection *mongo.Collection

func Init() func() {
	// Establish mongodb connection
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	// Guard against malformed URIs (e.g., accidental extra slashes). If parsing fails, fall back to localhost.
	if !strings.HasPrefix(mongoURI, "mongodb://") {
		logger.StdErr.Printf("MONGODB_URI malformed (%s); falling back to mongodb://localhost:27017\n", mongoURI)
		mongoURI = "mongodb://localhost:27017"
	}

	var (
		ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
		err         error
	)
	defer cancel()

	// Try primary URI, then fall back to localhost if the host "mongo" is unreachable (common when running API outside compose).
	connectURI := mongoURI
	Client, err = mongo.Connect(ctx, options.Client().ApplyURI(connectURI))
	if err != nil {
		logger.StdErr.Printf("failed to connect to Mongo at %s: %v\n", connectURI, err)
		// Always try a localhost fallback on any error (covers parse errors or host resolution failures)
		fallback := "mongodb://localhost:27017"
		if connectURI != fallback {
			logger.StdErr.Printf("retrying Mongo connection with fallback %s\n", fallback)
			Client, err = mongo.Connect(ctx, options.Client().ApplyURI(fallback))
		}
		if err != nil {
			logger.StdErr.Panicln(err)
		}
	}

	// Define mongodb database + collections
	Db = Client.Database("schej-it")
	EventsCollection = Db.Collection("events")
	UsersCollection = Db.Collection("users")
	DailyUserLogCollection = Db.Collection("dailyuserlogs")
	FriendRequestsCollection = Db.Collection("friendrequests")
	EventResponsesCollection = Db.Collection("eventResponses")
	AttendeesCollection = Db.Collection("attendees")
	FoldersCollection = Db.Collection("folders")
	FolderEventsCollection = Db.Collection("folderEvents")

	// Return a function to close the connection
	return func() {
		Client.Disconnect(ctx)
	}
}

// MongoDB backup / restore commands

// Backup
// mongodump --uri="mongodb://localhost:27017" --db=schej-it

// Restore
// mongorestore --uri="mongodb://localhost:27017" --drop --db=schej-it ./dump
