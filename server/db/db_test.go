package db_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"schej.it/server/db"
)

func requireIntegrationTests(t *testing.T) {
	t.Helper()
	if os.Getenv("RUN_INTEGRATION_TESTS") != "1" {
		t.Skip("set RUN_INTEGRATION_TESTS=1 to run MongoDB integration tests")
	}
}

func TestGetDailyUserLogByDate(t *testing.T) {
	requireIntegrationTests(t)
	db.Init()

	db.GetDailyUserLogByDate(time.Now(), 7)
}

func TestGenerateShortEventId(t *testing.T) {
	requireIntegrationTests(t)
	db.Init()

	id := db.GenerateShortEventId()
	fmt.Println(id)
}
