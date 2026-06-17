package respondents

import (
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ResolveStoredUserID accepts either an explicit embedded user id or a legacy
// outer storage key that encoded the signed-in user identity.
func ResolveStoredUserID(explicit primitive.ObjectID, storedKey string) (primitive.ObjectID, bool) {
	if explicit != primitive.NilObjectID {
		return explicit, true
	}

	objectID, err := primitive.ObjectIDFromHex(storedKey)
	if err != nil {
		return primitive.NilObjectID, false
	}

	return objectID, true
}

type CanonicalRecency struct {
	Primary    primitive.ObjectID
	Secondary  primitive.ObjectID
	TieBreaker string
}

// CompareCanonicalRecency returns 1 when a is newer/preferred, -1 when b is
// newer/preferred, and 0 when they are equivalent.
func CompareCanonicalRecency(a CanonicalRecency, b CanonicalRecency) int {
	if result := compareObjectIDPreference(a.Primary, b.Primary); result != 0 {
		return result
	}
	if result := compareObjectIDPreference(a.Secondary, b.Secondary); result != 0 {
		return result
	}

	return strings.Compare(a.TieBreaker, b.TieBreaker)
}

func compareObjectIDPreference(a primitive.ObjectID, b primitive.ObjectID) int {
	if a == b {
		return 0
	}
	if a == primitive.NilObjectID {
		return -1
	}
	if b == primitive.NilObjectID {
		return 1
	}

	aTimestamp := a.Timestamp()
	bTimestamp := b.Timestamp()
	if aTimestamp.After(bTimestamp) {
		return 1
	}
	if aTimestamp.Before(bTimestamp) {
		return -1
	}

	return strings.Compare(a.Hex(), b.Hex())
}
