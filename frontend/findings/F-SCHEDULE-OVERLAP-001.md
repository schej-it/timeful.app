# F-SCHEDULE-OVERLAP-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ScheduleOverlap.vue`
- Problem: Core scheduling state is still seeded from `localStorage`, and the component exposes a large instance-style API for parent coordination.
- Why it matters: Storage-coupled core state and imperative coordination make the main scheduling surface hard to test and risky to refactor.
- Acceptance criteria: Move storage-backed state behind explicit domain or composable boundaries, reduce imperative exposure, and preserve scheduling behavior and parity.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Added `src/composables/schedule_overlap/scheduleOverlapStorage.test.ts`. Firefox `inspect -- --target event-respondents-panel` passed from `migration/comparator` against the migrated app on `http://127.0.0.1:4173`. The corresponding Firefox compare run against the legacy app timed out waiting for the old-app readiness selector before diff collection.
- Implementation notes: Remaining schedule-overlap storage ownership now goes through explicit helpers in `src/composables/schedule_overlap/scheduleOverlapStorage.ts` and `src/components/schedule_overlap/useScheduleOverlapPreferences.ts`, with shared guest-name reads and writes reused by `ScheduleOverlap`, `useAvailabilityData`, `useEventLoader`, and the event plugin bridge. The exposed `ScheduleOverlap` instance contract was reduced by dropping the `states` export and moving the state comparison to `Event.vue`.
