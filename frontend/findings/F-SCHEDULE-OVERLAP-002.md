# F-SCHEDULE-OVERLAP-002

- Status: `planned`
- Priority: `P1`
- Component: `src/components/schedule_overlap/ScheduleOverlap.vue`
- Problem: The schedule-overlap view is still monolithic, with a large computed surface and broad coordination responsibilities.
- Why it matters: Even when behavior is correct, the component is expensive to change safely because unrelated concerns share one file.
- Acceptance criteria: Split the component along stable domain or UI boundaries without changing behavior, and keep extracted logic covered by targeted tests.
- Verification evidence: Not started.
- Implementation notes: Tackle this after the highest-risk state-ownership issues so decomposition builds on cleaner boundaries.
