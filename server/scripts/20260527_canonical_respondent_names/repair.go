package main

import (
	"schej.it/server/models"
	"schej.it/server/respondents"
)

type canonicalizedEventResponse struct {
	row     models.EventResponse
	updated bool
	deleted bool
}

type signUpRepairResult struct {
	rewritten         map[string]*models.SignUpResponse
	updated           bool
	deletedRows       int
	collisionResolved int
}

type signUpResponseEntry struct {
	storedKey string
	response  *models.SignUpResponse
}

func canonicalizeEventResponseRow(
	row models.EventResponse,
	lookupUser func(string) *models.User,
) canonicalizedEventResponse {
	if row.Response == nil {
		return canonicalizedEventResponse{row: row}
	}

	if resolvedUserID, ok := respondents.ResolveStoredUserID(row.Response.UserId, row.UserId); ok {
		updated := row.Response.UserId != resolvedUserID
		row.Response.UserId = resolvedUserID
		expectedUserId := resolvedUserID.Hex()
		if row.UserId != expectedUserId {
			row.UserId = expectedUserId
			updated = true
		}
		if user := lookupUser(expectedUserId); user != nil {
			_, _, displayName := respondents.SanitizeUserDisplayName(user)
			if row.Response.Name != displayName {
				row.Response.Name = displayName
				updated = true
			}
		}
		return canonicalizedEventResponse{row: row, updated: updated}
	}

	validation := respondents.ValidateGuestName(row.Response.Name)
	if validation.Code != respondents.GuestNameValid {
		return canonicalizedEventResponse{row: row, deleted: true}
	}

	updated := false
	if row.Response.Name != validation.Name {
		row.Response.Name = validation.Name
		updated = true
	}
	expectedUserId := validation.Name
	if row.Response.GuestId != "" {
		expectedUserId = row.Response.GuestId
	}
	if row.UserId != expectedUserId {
		row.UserId = expectedUserId
		updated = true
	}

	return canonicalizedEventResponse{row: row, updated: updated}
}

func candidateOverridesEventResponse(current models.EventResponse, candidate models.EventResponse) bool {
	currentUserID, _ := respondents.ResolveStoredUserID(current.Response.UserId, current.UserId)
	candidateUserID, _ := respondents.ResolveStoredUserID(candidate.Response.UserId, candidate.UserId)

	return respondents.CompareCanonicalRecency(
		respondents.CanonicalRecency{
			Primary:    candidate.Id,
			Secondary:  candidateUserID,
			TieBreaker: candidate.UserId,
		},
		respondents.CanonicalRecency{
			Primary:    current.Id,
			Secondary:  currentUserID,
			TieBreaker: current.UserId,
		},
	) > 0
}

func repairCanonicalEventResponseGroup(
	rows []models.EventResponse,
	lookupUser func(string) *models.User,
) (updates []models.EventResponse, deletedIDs []models.EventResponse, collisionsResolved int) {
	type winnerEntry struct {
		row     models.EventResponse
		updated bool
	}

	winners := make(map[string]winnerEntry, len(rows))
	for _, original := range rows {
		normalized := canonicalizeEventResponseRow(original, lookupUser)
		if normalized.deleted {
			deletedIDs = append(deletedIDs, normalized.row)
			continue
		}
		if normalized.row.Response == nil {
			continue
		}

		lookupKey := normalized.row.UserId
		if existing, exists := winners[lookupKey]; exists {
			collisionsResolved++
			if !candidateOverridesEventResponse(existing.row, normalized.row) {
				deletedIDs = append(deletedIDs, normalized.row)
				continue
			}
			deletedIDs = append(deletedIDs, existing.row)
		}
		winners[lookupKey] = winnerEntry{row: normalized.row, updated: normalized.updated}
	}

	for _, winner := range winners {
		if winner.updated {
			updates = append(updates, winner.row)
		}
	}

	return updates, deletedIDs, collisionsResolved
}

func repairSignUpResponseMap(
	input map[string]*models.SignUpResponse,
	lookupUser func(string) *models.User,
) signUpRepairResult {
	result := signUpRepairResult{
		rewritten: make(map[string]*models.SignUpResponse, len(input)),
	}
	winners := make(map[string]signUpResponseEntry, len(input))

	for storedKey, response := range input {
		if response == nil {
			continue
		}

		lookupKey := storedKey
		rowUpdated := false

		if resolvedUserID, ok := respondents.ResolveStoredUserID(response.UserId, storedKey); ok {
			rowUpdated = response.UserId != resolvedUserID
			response.UserId = resolvedUserID
			lookupKey = resolvedUserID.Hex()
			if user := lookupUser(lookupKey); user != nil {
				_, _, displayName := respondents.SanitizeUserDisplayName(user)
				if response.Name != displayName {
					response.Name = displayName
					rowUpdated = true
				}
			}
			if storedKey != lookupKey {
				rowUpdated = true
			}
		} else {
			validation := respondents.ValidateGuestName(response.Name)
			if validation.Code != respondents.GuestNameValid {
				result.deletedRows++
				result.updated = true
				continue
			}

			lookupKey = validation.Name
			if response.Name != validation.Name || storedKey != validation.Name {
				response.Name = validation.Name
				rowUpdated = true
			}
		}

		candidate := signUpResponseEntry{storedKey: storedKey, response: response}
		if existing, exists := winners[lookupKey]; exists {
			result.collisionResolved++
			result.deletedRows++
			result.updated = true
			if !candidateOverridesSignUpResponse(existing, candidate) {
				continue
			}
		}

		winners[lookupKey] = candidate
		result.updated = result.updated || rowUpdated
	}

	for lookupKey, winner := range winners {
		result.rewritten[lookupKey] = winner.response
	}

	return result
}

func candidateOverridesSignUpResponse(current signUpResponseEntry, candidate signUpResponseEntry) bool {
	currentUserID, _ := respondents.ResolveStoredUserID(current.response.UserId, current.storedKey)
	candidateUserID, _ := respondents.ResolveStoredUserID(candidate.response.UserId, candidate.storedKey)

	return respondents.CompareCanonicalRecency(
		respondents.CanonicalRecency{
			Primary:    candidateUserID,
			TieBreaker: candidate.storedKey,
		},
		respondents.CanonicalRecency{
			Primary:    currentUserID,
			TieBreaker: current.storedKey,
		},
	) > 0
}
