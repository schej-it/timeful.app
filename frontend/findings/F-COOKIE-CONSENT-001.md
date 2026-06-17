# F-COOKIE-CONSENT-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/CookieConsent.vue`
- Problem: Consent bootstrapping runs directly from browser storage, and accept-flow behavior still uses `window.location.reload()`.
- Why it matters: Consent state should cross an explicit boundary instead of being coordinated through ad hoc browser-side effects.
- Acceptance criteria: Centralize consent persistence and state transitions behind a clear boundary, remove reload-based control flow, and preserve current consent behavior.
- Verification evidence:
  - Reconfirmed that `src/components/CookieConsent.vue` read `localStorage` directly during setup and called `window.location.reload()` after persisting consent before this change.
  - Centralized consent reads, normalized preference defaults, and write notifications in `src/utils/cookie_utils.ts`, then updated `CookieConsent.vue` to hydrate and react through that shared boundary instead of direct browser-side effects.
  - Added focused regression coverage in `src/components/CookieConsent.test.ts` and `src/utils/cookie_utils.test.ts` for corrupt or missing consent, shared consent updates, persisted preference normalization, and reload removal.
  - Ran `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` in `frontend/` on 2026-05-24; all checks passed.
- Implementation notes: Preserved the current default consent preference shape and kept live GTM/PostHog reconfiguration out of scope for this ownership fix.
