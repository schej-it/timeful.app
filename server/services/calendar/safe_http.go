package calendar

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"syscall"
	"time"
)

// ssrfSafeClient is an HTTP client used to fetch user-supplied URLs (e.g. ICS
// calendar feeds). Its dialer rejects connections to non-public IP addresses,
// which prevents Server-Side Request Forgery (SSRF) — a user could otherwise
// point a feed URL at internal services or the cloud metadata endpoint
// (169.254.169.254) and have the server fetch them on their behalf.
//
// The check runs inside the dialer's Control hook, which fires *after* DNS
// resolution with the concrete address about to be dialed. That means it also
// defends against DNS-rebinding, where a hostname resolves to a public IP at
// validation time and a private IP at fetch time, and it re-runs on every
// redirect hop.
var ssrfSafeClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		DialContext: (&net.Dialer{
			Timeout: 10 * time.Second,
			Control: func(network, address string, _ syscall.RawConn) error {
				host, _, err := net.SplitHostPort(address)
				if err != nil {
					return err
				}
				ip := net.ParseIP(host)
				if ip == nil {
					return fmt.Errorf("could not parse IP from address %q", address)
				}
				if isDisallowedIP(ip) {
					return fmt.Errorf("refusing to connect to non-public address %s", ip)
				}
				return nil
			},
		}).DialContext,
	},
}

// isDisallowedIP reports whether the given IP is one we must never let a
// user-supplied URL reach (loopback, private, link-local, metadata, etc.).
func isDisallowedIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsMulticast() || ip.IsInterfaceLocalMulticast() {
		return true
	}
	// Carrier-grade NAT range (100.64.0.0/10) is not covered by IsPrivate.
	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 100 && ip4[1]&0xc0 == 64 {
			return true
		}
	}
	return false
}

// safeGet performs an HTTP GET against a user-supplied URL while guarding
// against SSRF. Only http/https URLs are allowed, and the connection is
// refused if the host resolves to a non-public address.
func safeGet(rawURL string) (*http.Response, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme %q", parsed.Scheme)
	}

	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	return ssrfSafeClient.Do(req)
}
