# F-UPGRADE-DIALOG-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/pricing/UpgradeDialog.vue`
- Problem: Watchers still trigger analytics and initialization, and checkout flow redirects through `window.location.href`.
- Why it matters: Pricing flow ownership is spread across view state and browser-side effects, which makes upgrade behavior fragile.
- Acceptance criteria: Move analytics and checkout coordination behind explicit actions or composables, replace direct redirect wiring where appropriate, and preserve current upgrade behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Existing and updated coverage passed in `src/components/pricing/UpgradeDialog.test.ts`.
- Implementation notes: Upgrade analytics, student-toggle tracking, dialog-view tracking, and checkout/sign-up redirects now run through explicit handlers instead of watcher-owned side effects while keeping the existing pricing and navigation behavior unchanged.
