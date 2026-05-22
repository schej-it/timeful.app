package appenv

import "testing"

func TestParse(t *testing.T) {
	t.Parallel()

	testCases := map[string]Environment{
		"":             Development,
		"   ":          Development,
		"development":  Development,
		" DEVELOPMENT": Development,
		"staging":      Staging,
		" StAgInG ":    Staging,
		"production":   Production,
		" Prod ":       Production,
		"invalid":      Development,
	}

	for input, expected := range testCases {
		input := input
		expected := expected

		t.Run(input, func(t *testing.T) {
			t.Parallel()

			if actual := Parse(input); actual != expected {
				t.Fatalf("Parse(%q) = %q, want %q", input, actual, expected)
			}
		})
	}
}

func TestShouldUseReleaseMode(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name     string
		ginMode  string
		env      Environment
		expected bool
	}{
		{name: "development defaults to debug", env: Development, expected: false},
		{name: "staging defaults to release", env: Staging, expected: true},
		{name: "production defaults to release", env: Production, expected: true},
		{name: "release override wins in development", ginMode: "release", env: Development, expected: true},
		{name: "production alias wins in development", ginMode: " production ", env: Development, expected: true},
		{name: "debug override wins in staging", ginMode: "debug", env: Staging, expected: false},
		{name: "development override wins in production", ginMode: " DEVELOPMENT ", env: Production, expected: false},
	}

	for _, testCase := range testCases {
		testCase := testCase

		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			if actual := ShouldUseReleaseMode(testCase.ginMode, testCase.env); actual != testCase.expected {
				t.Fatalf(
					"ShouldUseReleaseMode(%q, %q) = %t, want %t",
					testCase.ginMode,
					testCase.env,
					actual,
					testCase.expected,
				)
			}
		})
	}
}

func TestPort(t *testing.T) {
	t.Parallel()

	if actual := Port(Development); actual != "3002" {
		t.Fatalf("Port(development) = %q, want %q", actual, "3002")
	}

	if actual := Port(Staging); actual != "3003" {
		t.Fatalf("Port(staging) = %q, want %q", actual, "3003")
	}

	if actual := Port(Production); actual != "3002" {
		t.Fatalf("Port(production) = %q, want %q", actual, "3002")
	}
}
