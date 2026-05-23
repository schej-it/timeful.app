# F-SCHEDULE-OVERLAP-SIDEBAR-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/schedule_overlap/ScheduleOverlapSidebar.vue`
- Problem: Sidebar behavior still reaches through `respondentsPanelRef.value?.$el` and exposes DOM-facing scroll helpers.
- Why it matters: DOM reach-ins couple the sidebar to child implementation details and block cleaner composition boundaries.
- Acceptance criteria: Replace `$el` access and exposed scroll helpers with typed, explicit child contracts or shared state, while preserving current sidebar behavior.
- Verification evidence: Not started.
- Implementation notes: Coordinate with any `RespondentsList` or respondents-panel decomposition so contracts do not churn twice.
