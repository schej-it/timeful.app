package envfiles

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"schej.it/server/appenv"
)

// Load reads the first matching repo env file without overriding existing shell variables.
func Load() (string, error) {
	explicitPath := strings.TrimSpace(os.Getenv("ENV_FILE"))
	if explicitPath != "" {
		if err := godotenv.Load(explicitPath); err != nil {
			return "", err
		}

		return explicitPath, nil
	}

	for _, candidate := range defaultCandidates() {
		if _, err := os.Stat(candidate); err == nil {
			if err := godotenv.Load(candidate); err != nil {
				return "", err
			}

			return candidate, nil
		}
	}

	return "", nil
}

func defaultCandidates() []string {
	switch appenv.Current() {
	case appenv.Staging:
		return []string{".env.staging", "../.env.staging"}
	case appenv.Production:
		return []string{".env.prod", "../.env.prod"}
	default:
		return []string{".env.dev", "../.env.dev"}
	}
}

func MissingFileMessage() string {
	switch appenv.Current() {
	case appenv.Staging:
		return "No root env file found, continuing with process environment variables only (expected .env.staging)."
	case appenv.Production:
		return "No root env file found, continuing with process environment variables only (expected .env.prod)."
	default:
		return "No root env file found, continuing with process environment variables only (expected .env.dev)."
	}
}

func InvalidExplicitPathMessage(err error) string {
	return fmt.Sprintf("Failed to load ENV_FILE: %v", err)
}
