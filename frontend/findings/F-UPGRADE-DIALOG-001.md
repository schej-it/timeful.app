# F-UPGRADE-DIALOG-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/pricing/UpgradeDialog.vue`
- Problem: Watchers still trigger analytics and initialization, and checkout flow redirects through `window.location.href`.
- Why it matters: Pricing flow ownership is spread across view state and browser-side effects, which makes upgrade behavior fragile.
- Acceptance criteria: Move analytics and checkout coordination behind explicit actions or composables, replace direct redirect wiring where appropriate, and preserve current upgrade behavior.
- Verification evidence: Not started.
- Implementation notes: Reconfirm the provider and pricing-card flows before extracting logic because parity changes here are user-visible.
