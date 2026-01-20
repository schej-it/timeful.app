package main

import (
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v82"
	"schej.it/server/db"
	"schej.it/server/logger"
	"schej.it/server/routes"
	"schej.it/server/services/gcloud"
	"schej.it/server/slackbot"
	"schej.it/server/utils"

	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "schej.it/server/docs"
)

// @title Schej.it API
// @version 1.0
// @description This is the API for Schej.it!

// @host localhost:3002/api

func main() {
	// Set release flag
	release := flag.Bool("release", false, "Whether this is the release version of the server")
	flag.Parse()
	if *release {
		os.Setenv("GIN_MODE", "release")
		gin.SetMode(gin.ReleaseMode)
	} else {
		os.Setenv("GIN_MODE", "debug")
	}

	// Init logfile
	logFile, err := os.OpenFile("logs.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}
	gin.DefaultWriter = io.MultiWriter(logFile, os.Stdout)

	// Init logger
	logger.Init(logFile)

	// Load .env variables
	loadDotEnv()

	// Init router
	router := gin.New()
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		var statusColor, methodColor, resetColor string
		if param.IsOutputColor() {
			statusColor = param.StatusCodeColor()
			methodColor = param.MethodColor()
			resetColor = param.ResetColor()
		}

		if param.Latency > time.Minute {
			param.Latency = param.Latency.Truncate(time.Second)
		}
		return fmt.Sprintf("%v |%s %3d %s| %13v | %15s |%s %-7s %s %#v\n%s",
			param.TimeStamp.Format("2006/01/02 15:04:05"),
			statusColor, param.StatusCode, resetColor,
			param.Latency,
			param.ClientIP,
			methodColor, param.Method, resetColor,
			param.Path,
			param.ErrorMessage,
		)
	}))
	router.Use(gin.Recovery())

	// Cors
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8080", "https://www.schej.it", "https://schej.it", "https://www.timeful.app", "https://timeful.app"},
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE"},
		AllowHeaders:     []string{"Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Init database
	closeConnection := db.Init()
	defer closeConnection()

	// Init google cloud stuff
	closeTasks := gcloud.InitTasks()
	defer closeTasks()

	// Session
	store := cookie.NewStore([]byte("secret"))
	router.Use(sessions.Sessions("session", store))

	// Init routes
	apiRouter := router.Group("/api")
	routes.InitAuth(apiRouter)
	routes.InitUser(apiRouter)
	routes.InitEvents(apiRouter)
	routes.InitAnalytics(apiRouter)
	routes.InitStripe(apiRouter)
	routes.InitFolders(apiRouter)
	slackbot.InitSlackbot(apiRouter)

	// Get frontend path
	frontendPath := "../frontend/dist"
	if os.Getenv("NODE_ENV") == "staging" {
		frontendPath = "../frontend/staging_dist"
	}
	err = filepath.WalkDir(frontendPath, func(path string, d fs.DirEntry, err error) error {
		if !d.IsDir() && d.Name() != "index.html" {
			split := splitPath(path)
			newPath := filepath.Join(split[3:]...)
			router.StaticFile(fmt.Sprintf("/%s", newPath), path)
		}
		return nil
	})
	if err != nil {
		log.Fatalf("failed to walk directories: %s", err)
	}

	router.LoadHTMLFiles(filepath.Join(frontendPath, "index.html"))
	router.NoRoute(noRouteHandler())

	// Init swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	// Run server
	router.Run(":3002")
}

// Load .env variables
func loadDotEnv() {
	err := godotenv.Load(".env")

	// Load stripe key
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	if err != nil {
		logger.StdErr.Panicln("Error loading .env file")
	}
}

func noRouteHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		params := gin.H{}
		path := c.Request.URL.Path

		// Determine meta tags based off URL
		if match := regexp.MustCompile(`\/e\/(\w+)`).FindStringSubmatchIndex(path); match != nil {
			// /e/:eventId
			eventId := path[match[2]:match[3]]
			event := db.GetEventByEitherId(eventId)

			if event != nil {
				title := fmt.Sprintf("%s - Timeful (formerly Schej)", event.Name)
				params = gin.H{
					"title":   title,
					"ogTitle": title,
				}

				if len(utils.Coalesce(event.When2meetHref)) > 0 {
					params["ogImage"] = "/img/when2meetOgImage2.png"
				}
			}
		}

		c.HTML(http.StatusOK, "index.html", params)
	}
}

func splitPath(path string) []string {
	dir, last := filepath.Split(path)
	if dir == "" {
		return []string{last}
	}
	return append(splitPath(filepath.Clean(dir)), last)
}
