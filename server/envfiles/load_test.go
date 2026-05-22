package envfiles

import (
	"os"
	"testing"
)

func TestDefaultCandidates(t *testing.T) {
	testCases := []struct {
		name      string
		appEnv    string
		ginMode   string
		expected0 string
	}{
		{name: "development defaults to dev env file", appEnv: "development", expected0: ".env.dev"},
		{name: "blank app env defaults to dev env file", appEnv: "   ", expected0: ".env.dev"},
		{name: "staging uses staging env file", appEnv: "staging", expected0: ".env.staging"},
		{name: "production uses prod env file", appEnv: "production", expected0: ".env.prod"},
		{name: "release gin mode does not override development env file", appEnv: "development", ginMode: "release", expected0: ".env.dev"},
		{name: "debug gin mode does not override production env file", appEnv: "production", ginMode: "debug", expected0: ".env.prod"},
	}

	for _, testCase := range testCases {
		testCase := testCase

		t.Run(testCase.name, func(t *testing.T) {
			t.Setenv("APP_ENV", testCase.appEnv)
			t.Setenv("GIN_MODE", testCase.ginMode)
			t.Setenv("ENV_FILE", "")

			candidates := defaultCandidates()
			if len(candidates) == 0 {
				t.Fatal("defaultCandidates returned no candidates")
			}

			if candidates[0] != testCase.expected0 {
				t.Fatalf("defaultCandidates()[0] = %q, want %q", candidates[0], testCase.expected0)
			}
		})
	}
}

func TestMissingFileMessage(t *testing.T) {
	t.Run("development expects dev env file", func(t *testing.T) {
		t.Setenv("APP_ENV", "development")
		t.Setenv("GIN_MODE", "")

		expected := "No root env file found, continuing with process environment variables only (expected .env.dev)."
		if actual := MissingFileMessage(); actual != expected {
			t.Fatalf("MissingFileMessage() = %q, want %q", actual, expected)
		}
	})

	t.Run("staging expects staging env file", func(t *testing.T) {
		t.Setenv("APP_ENV", "staging")
		t.Setenv("GIN_MODE", "")

		expected := "No root env file found, continuing with process environment variables only (expected .env.staging)."
		if actual := MissingFileMessage(); actual != expected {
			t.Fatalf("MissingFileMessage() = %q, want %q", actual, expected)
		}
	})

	t.Run("production expects prod env file", func(t *testing.T) {
		t.Setenv("APP_ENV", "production")
		t.Setenv("GIN_MODE", "")

		expected := "No root env file found, continuing with process environment variables only (expected .env.prod)."
		if actual := MissingFileMessage(); actual != expected {
			t.Fatalf("MissingFileMessage() = %q, want %q", actual, expected)
		}
	})
}

func TestInvalidExplicitPathMessage(t *testing.T) {
	t.Parallel()

	err := os.ErrNotExist
	expected := "Failed to load ENV_FILE: file does not exist"
	if actual := InvalidExplicitPathMessage(err); actual != expected {
		t.Fatalf("InvalidExplicitPathMessage() = %q, want %q", actual, expected)
	}
}
