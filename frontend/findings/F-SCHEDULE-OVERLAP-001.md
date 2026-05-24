# F-SCHEDULE-OVERLAP-001

- Status: `in_progress`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ScheduleOverlap.vue`
- Problem: Core scheduling state is still seeded from `localStorage`, and the component exposes a large instance-style API for parent coordination.
- Why it matters: Storage-coupled core state and imperative coordination make the main scheduling surface hard to test and risky to refactor.
- Acceptance criteria: Move storage-backed state behind explicit domain or composable boundaries, reduce imperative exposure, and preserve scheduling behavior and parity.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Added `src/composables/timezone/useOwnedTimezone.test.ts` and updated `src/components/schedule_overlap/TimezoneSelector.test.ts` plus related schedule-overlap view-model tests.
- Implementation notes: Timezone persistence now lives behind `useOwnedTimezone`, and `ScheduleOverlap` owns reset and persistence instead of the selector. The exposed instance-style API remains and still needs follow-up before this finding can be closed.
