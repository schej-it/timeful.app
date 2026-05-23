# F-SCHEDULE-OVERLAP-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ScheduleOverlap.vue`
- Problem: Core scheduling state is still seeded from `localStorage`, and the component exposes a large instance-style API for parent coordination.
- Why it matters: Storage-coupled core state and imperative coordination make the main scheduling surface hard to test and risky to refactor.
- Acceptance criteria: Move storage-backed state behind explicit domain or composable boundaries, reduce imperative exposure, and preserve scheduling behavior and parity.
- Verification evidence: Not started.
- Implementation notes: Confirm reproduction on real event routes and add regression coverage around any extracted scheduling state.
