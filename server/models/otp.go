package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OtpCode struct {
	Id        primitive.ObjectID `json:"_id" bson:"_id,omitempty"`
	Email     string             `json:"email" bson:"email"`
	Code      string             `json:"-" bson:"code"`
	ExpiresAt time.Time          `json:"-" bson:"expiresAt"`
	Attempts  int                `json:"-" bson:"attempts"`
}
