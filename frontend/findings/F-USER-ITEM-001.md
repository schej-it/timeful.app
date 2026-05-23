# F-USER-ITEM-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/UserItem.vue`
- Problem: `showEventNames` is initialized from `localStorage`, then a watcher persists and emits from the same reactive path.
- Why it matters: Browser storage currently owns user-facing state that should have a clearer boundary, which makes behavior harder to test and reason about.
- Acceptance criteria: Move storage reads and writes behind an explicit boundary or composable, keep the component focused on rendering and user interaction, and preserve current behavior.
- Verification evidence: Not started.
- Implementation notes: Confirm current persistence behavior first and add targeted regression coverage around initialization and updates if practical.
