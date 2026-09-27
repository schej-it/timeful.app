package routes

import "testing"

func resetAllowedEmailStateForTests() {
	allowedEmailState.Lock()
	defer allowedEmailState.Unlock()
	allowedEmailState.rawEmails = ""
	allowedEmailState.rawDomains = ""
	allowedEmailState.allowedEmails = map[string]struct{}{}
	allowedEmailState.allowedEmailTlds = map[string]struct{}{}
}

func TestIsAllowedEmail_Unrestricted(t *testing.T) {
	resetAllowedEmailStateForTests()
	t.Setenv("ALLOWED_EMAILS", "")
	t.Setenv("ALLOWED_EMAIL_DOMAINS", "")

	if !isAllowedEmail("anyone@example.com") {
		t.Fatal("expected unrestricted mode to allow any email")
	}
}

func TestIsAllowedEmail_AllowsExactEmail(t *testing.T) {
	resetAllowedEmailStateForTests()
	t.Setenv("ALLOWED_EMAILS", "Person@One.com, someone@else.com")
	t.Setenv("ALLOWED_EMAIL_DOMAINS", "")

	if !isAllowedEmail("person@one.com") {
		t.Fatal("expected exact email allowlist match")
	}
}

func TestIsAllowedEmail_AllowsDomain(t *testing.T) {
	resetAllowedEmailStateForTests()
	t.Setenv("ALLOWED_EMAILS", "")
	t.Setenv("ALLOWED_EMAIL_DOMAINS", "berkeley.edu, example.org")

	if !isAllowedEmail("user@berkeley.edu") {
		t.Fatal("expected domain allowlist match")
	}
}

func TestIsAllowedEmail_RejectsUnknownEmail(t *testing.T) {
	resetAllowedEmailStateForTests()
	t.Setenv("ALLOWED_EMAILS", "allowed@other.com")
	t.Setenv("ALLOWED_EMAIL_DOMAINS", "berkeley.edu")

	if isAllowedEmail("blocked@example.com") {
		t.Fatal("expected unknown email and domain to be rejected")
	}
}
