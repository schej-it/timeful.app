package gcloud

import (
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	"schej.it/server/envfiles"
	"schej.it/server/logger"
)

func TestCreateEmailTask(t *testing.T) {
	// Init logfile
	logFile, err := os.OpenFile("logs.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}

	// Init logger
	logger.Init(logFile)

	// Load root env file
	_, err = envfiles.Load()
	if err != nil {
		logger.StdErr.Panicln("Error loading env file")
	}

	InitTasks()
	CreateEmailTask("schej.team@gmail.com", "Jonathan", "casablanca", "65e636bb760d3ea2e113e161")
}

func TestDeleteEmailTask(t *testing.T) {
	// Init logfile
	logFile, err := os.OpenFile("logs.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}

	// Init logger
	logger.Init(logFile)

	// Load root env file
	_, err = envfiles.Load()
	if err != nil {
		logger.StdErr.Panicln("Error loading env file")
	}

	InitTasks()

	// Should fail
	fmt.Println("Delete email task that doesn't exist...")
	DeleteEmailTask("id_that_doesn't_exist")
	fmt.Println("Should have thrown an error ^")

	// Should succeed
	fmt.Println("Creating email task...")
	taskIds := CreateEmailTask("schej.team@gmail.com", "Jonathan", "casablanca", "65e636bb760d3ea2e113e161")
	fmt.Println("Email task created")

	time.Sleep(10 * time.Second)
	for _, taskId := range taskIds {
		fmt.Println("Deleting email task with taskId: ", taskId)
		DeleteEmailTask(taskId)
		fmt.Println("Deleted email task with taskId: ", taskId)
	}

	fmt.Println("Done.")
}
