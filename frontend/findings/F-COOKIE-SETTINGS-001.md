# F-COOKIE-SETTINGS-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/CookieSettings.vue`
- Problem: Settings initialization and apply behavior still depend on mount-time storage reads and `window.location.reload()`.
- Why it matters: Browser-owned flow hides state transitions that should be explicit and testable.
- Acceptance criteria: Move settings reads and writes behind an explicit boundary, remove reload-based flow, and preserve current cookie-settings UX.
- Verification evidence: Not started.
- Implementation notes: Keep this aligned with any shared consent-state work so the two components do not diverge.
