# F-CONFIRM-DETAILS-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ConfirmDetailsDialog.vue`
- Problem: The dialog exposes an imperative `setData()` API and runs debounced contact search directly inside the component.
- Why it matters: Data preparation, async search, and dialog rendering are tightly coupled, which makes state transitions hard to test.
- Acceptance criteria: Move data preparation and search coordination behind explicit helpers or composables, remove the imperative dialog API, and preserve current confirmation behavior.
- Verification evidence: Not started.
- Implementation notes: Add regression coverage around contact search and dialog state transitions when practical.
