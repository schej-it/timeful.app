# F-SCHEDULE-OVERLAP-002

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/schedule_overlap/ScheduleOverlap.vue`
- Problem: The schedule-overlap view is still monolithic, with a large computed surface and broad coordination responsibilities.
- Why it matters: Even when behavior is correct, the component is expensive to change safely because unrelated concerns share one file.
- Acceptance criteria: Split the component along stable domain or UI boundaries without changing behavior, and keep extracted logic covered by targeted tests.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Firefox `inspect -- --target event-respondents-panel` passed from `migration/comparator` against the migrated app on `http://127.0.0.1:4173`.
- Implementation notes: `ScheduleOverlap.vue` now acts as the route-facing shell while extracted helpers own persistence preferences and view-model assembly. `src/components/schedule_overlap/useScheduleOverlapViewModels.ts` holds the sidebar, mobile overlay, tool-row, and grid view-model composition so the shell no longer owns every computed presentation boundary inline.
