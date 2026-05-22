package envfiles

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
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
	if isProductionLike() {
		return []string{".env.prod", "../.env.prod"}
	}

	return []string{".env.dev", "../.env.dev"}
}

func isProductionLike() bool {
	for _, value := range []string{os.Getenv("GIN_MODE"), os.Getenv("NODE_ENV")} {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "release" || normalized == "prod" || normalized == "production" {
			return true
		}
	}

	return false
}

func MissingFileMessage() string {
	if isProductionLike() {
		return "No root env file found, continuing with process environment variables only (expected .env.prod)."
	}

	return "No root env file found, continuing with process environment variables only (expected .env.dev)."
}

func InvalidExplicitPathMessage(err error) string {
	return fmt.Sprintf("Failed to load ENV_FILE: %v", err)
}
