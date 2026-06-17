package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	"schej.it/server/appenv"
	"schej.it/server/db"
	"schej.it/server/envfiles"
	"schej.it/server/logger"
	"schej.it/server/routes"
	"schej.it/server/services/gcloud"
	"schej.it/server/slackbot"
	"schej.it/server/utils"

	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "schej.it/server/docs"
)

const defaultLogPath = "logs/server.log"

// @title Schej.it API
// @version 1.0
// @description This is the API for Schej.it!

// @host localhost:3002/api

func init() {
	mime.AddExtensionType(".css", "text/css")
	mime.AddExtensionType(".js", "application/javascript")
	mime.AddExtensionType(".svg", "image/svg+xml")
	mime.AddExtensionType(".woff", "font/woff")
	mime.AddExtensionType(".woff2", "font/woff2")
	mime.AddExtensionType(".ttf", "font/ttf")
	mime.AddExtensionType(".json", "application/json")
	mime.AddExtensionType(".map", "application/json")
}

func main() {
	// Set release flag
	release := flag.Bool("release", false, "Whether this is the release version of the server")
	flag.Parse()
	currentAppEnv := appenv.Current()
	if *release || shouldRunInReleaseMode(currentAppEnv) {
		os.Setenv("GIN_MODE", "release")
		gin.SetMode(gin.ReleaseMode)
	} else {
		os.Setenv("GIN_MODE", "debug")
	}

	// Init logfile
	logFile, err := openLogFile(defaultLogPath)
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
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = strings.Join([]string{
			"https://www.schej.it",
			"https://schej.it",
			"https://www.timeful.app",
			"https://timeful.app",
			"http://localhost:8080",
			"http://localhost:4173",
			"http://localhost:4174",
			"http://127.0.0.1:4173",
			"http://127.0.0.1:4174",
		}, ",")
	}
	router.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(corsOrigins, ","),
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
	store := cookie.NewStore([]byte(os.Getenv("SESSION_SECRET")))
	router.Use(sessions.Sessions("session", store))

	// Init routes
	apiRouter := router.Group("/api")
	apiRouter.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	routes.InitAuth(apiRouter)
	routes.InitUser(apiRouter)
	routes.InitUsers(apiRouter)
	routes.InitEvents(apiRouter)
	routes.InitAnalytics(apiRouter)
	routes.InitStripe(apiRouter)
	routes.InitFolders(apiRouter)
	slackbot.InitSlackbot(apiRouter)

	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendDist == "" {
		frontendDist = "./frontend/dist"
		if _, err := os.Stat(frontendDist); os.IsNotExist(err) {
			frontendDist = "../frontend/dist"
		}
	}

	indexPath := filepath.Join(frontendDist, "index.html")
	hasFrontendIndex := false
	if _, err := os.Stat(indexPath); err == nil {
		router.LoadHTMLFiles(indexPath)
		hasFrontendIndex = true
	} else {
		logger.StdErr.Printf("Warning: index.html not found at %s", indexPath)
	}
	router.GET("/e/:eventId", eventPageHandler(hasFrontendIndex))
	router.NoRoute(noRouteHandler())

	// Init swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	// Run server
	router.Run(":" + appenv.Port(currentAppEnv))
}

func shouldRunInReleaseMode(env appenv.Environment) bool {
	return appenv.ShouldUseReleaseMode(os.Getenv("GIN_MODE"), env)
}

func openLogFile(path string) (*os.File, error) {
	logDir := filepath.Dir(path)
	if logDir != "." {
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return nil, err
		}
	}

	return os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
}

// Load .env variables
func loadDotEnv() {
	loadedPath, err := envfiles.Load()
	if err != nil {
		if os.Getenv("ENV_FILE") != "" {
			logger.StdErr.Panicln(envfiles.InvalidExplicitPathMessage(err))
		}

		logger.StdErr.Panicln(err)
	}
	if loadedPath == "" {
		logger.StdOut.Println(envfiles.MissingFileMessage())
	} else {
		logger.StdOut.Printf("Loaded environment variables from %s\n", loadedPath)
	}

	// Load stripe key
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	// Validate session secret
	validateSessionSecret()
}

// validateSessionSecret ensures SESSION_SECRET is set and meets security requirements
func validateSessionSecret() {
	secret := os.Getenv("SESSION_SECRET")

	if secret == "" {
		logger.StdErr.Panicln("SESSION_SECRET environment variable is required but not set")
	}

	// Minimum 32 characters for adequate security (256 bits)
	if len(secret) < 32 {
		logger.StdErr.Panicln("SESSION_SECRET must be at least 32 characters long")
	}
}

func eventPageHandler(hasFrontendIndex bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !hasFrontendIndex {
			c.JSON(http.StatusNotFound, gin.H{"error": "route not found"})
			return
		}

		params := gin.H{}

		eventId := c.Param("eventId")
		event := db.GetEventByEitherId(eventId)

		if event != nil {
			title := fmt.Sprintf("%s - Timeful (formerly Schej)", event.Name)
			params["title"] = title
			params["ogTitle"] = title

			if len(utils.Coalesce(event.When2meetHref)) > 0 {
				params["ogImage"] = "/img/when2meetOgImage2.png"
			}
		}

		c.HTML(http.StatusOK, "index.html", params)
	}
}

func noRouteHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "route not found"})
	}
}
