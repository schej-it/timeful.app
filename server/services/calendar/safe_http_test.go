package calendar

import (
	"net"
	"testing"
)

func TestIsDisallowedIP(t *testing.T) {
	cases := []struct {
		ip         string
		disallowed bool
	}{
		// Public addresses should be allowed.
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"93.184.216.34", false}, // example.com
		{"2606:2800:220:1:248:1893:25c8:1946", false},

		// Loopback.
		{"127.0.0.1", true},
		{"::1", true},
		// Private ranges.
		{"10.0.0.1", true},
		{"172.16.5.4", true},
		{"192.168.1.1", true},
		{"fd00::1", true},
		// Link-local (includes the cloud metadata endpoint).
		{"169.254.169.254", true},
		{"fe80::1", true},
		// Unspecified.
		{"0.0.0.0", true},
		{"::", true},
		// Carrier-grade NAT.
		{"100.64.0.1", true},
		{"100.127.255.255", true},
	}

	for _, tc := range cases {
		ip := net.ParseIP(tc.ip)
		if ip == nil {
			t.Fatalf("failed to parse test IP %q", tc.ip)
		}
		if got := isDisallowedIP(ip); got != tc.disallowed {
			t.Errorf("isDisallowedIP(%s) = %v, want %v", tc.ip, got, tc.disallowed)
		}
	}
}

func TestSafeGetRejectsNonHTTPSchemes(t *testing.T) {
	for _, rawURL := range []string{
		"file:///etc/passwd",
		"gopher://127.0.0.1:11211",
		"ftp://example.com/resource",
	} {
		if _, err := safeGet(rawURL); err == nil {
			t.Errorf("safeGet(%q) = nil error, want error for disallowed scheme", rawURL)
		}
	}
}
