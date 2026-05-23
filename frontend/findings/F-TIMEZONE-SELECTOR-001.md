# F-TIMEZONE-SELECTOR-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/schedule_overlap/TimezoneSelector.vue`
- Problem: The control mirrors props into local state and persists selection through `localStorage` from inside the selector.
- Why it matters: The selector currently owns both input state and persistence side effects, which blurs the boundary between view logic and application state.
- Acceptance criteria: Keep one clear owner for timezone state, move persistence behind an explicit boundary, and preserve existing user-visible behavior.
- Verification evidence: Not started.
- Implementation notes: Align this work with broader scheduling-state ownership changes to avoid duplicate state migrations.
