package appenv

import (
	"os"
	"strings"
)

type Environment string

const (
	Development Environment = "development"
	Staging     Environment = "staging"
	Production  Environment = "production"
)

func Parse(value string) Environment {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(Development):
		return Development
	case string(Staging):
		return Staging
	case string(Production):
		return Production
	default:
		return Development
	}
}

func Current() Environment {
	return Parse(os.Getenv("APP_ENV"))
}

func IsProductionLike(env Environment) bool {
	return env == Staging || env == Production
}

func ShouldUseReleaseMode(ginMode string, env Environment) bool {
	switch strings.ToLower(strings.TrimSpace(ginMode)) {
	case "debug", string(Development):
		return false
	case "release", string(Production):
		return true
	default:
		return IsProductionLike(env)
	}
}

func Port(env Environment) string {
	if env == Staging {
		return "3003"
	}

	return "3002"
}
