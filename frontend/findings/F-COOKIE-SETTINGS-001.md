# F-COOKIE-SETTINGS-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/CookieSettings.vue`
- Problem: Settings initialization and apply behavior still depend on mount-time storage reads and `window.location.reload()`.
- Why it matters: Browser-owned flow hides state transitions that should be explicit and testable.
- Acceptance criteria: Move settings reads and writes behind an explicit boundary, remove reload-based flow, and preserve current cookie-settings UX.
- Verification evidence:
  - Reconfirmed that `src/components/CookieSettings.vue` loaded saved consent through mount-time reads and reloaded the page after saves before this change.
  - Moved the settings page onto the shared consent boundary in `src/utils/cookie_utils.ts`, removed reload-based flow, and kept the settings page synchronized through the shared consent version signal.
  - Added focused regression coverage in `src/components/CookieSettings.test.ts` for setup hydration, explicit saves, external consent updates, and reload removal.
  - Ran `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` in `frontend/` on 2026-05-24; all checks passed.
- Implementation notes: Kept the page-local state simple and reused the same normalized consent defaults as the banner so the two consent entry points cannot drift.
