# F-COOKIE-CONSENT-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/CookieConsent.vue`
- Problem: Consent bootstrapping runs directly from browser storage, and accept-flow behavior still uses `window.location.reload()`.
- Why it matters: Consent state should cross an explicit boundary instead of being coordinated through ad hoc browser-side effects.
- Acceptance criteria: Centralize consent persistence and state transitions behind a clear boundary, remove reload-based control flow, and preserve current consent behavior.
- Verification evidence: Not started.
- Implementation notes: Reconfirm any SSR or first-load assumptions before changing initialization timing.
