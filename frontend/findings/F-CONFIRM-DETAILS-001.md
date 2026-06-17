# F-CONFIRM-DETAILS-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ConfirmDetailsDialog.vue`
- Problem: The dialog exposes an imperative `setData()` API and runs debounced contact search directly inside the component.
- Why it matters: Data preparation, async search, and dialog rendering are tightly coupled, which makes state transitions hard to test.
- Acceptance criteria: Move data preparation and search coordination behind explicit helpers or composables, remove the imperative dialog API, and preserve current confirmation behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-23. Added unit coverage in `src/components/schedule_overlap/ConfirmDetailsDialog.test.ts` for parent-owned draft updates after removing the imperative `setData()` API and moving debounced contact lookup behind shared composables.
- Implementation notes: Add regression coverage around contact search and dialog state transitions when practical.
