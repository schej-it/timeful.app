# F-RESPONDENTS-LIST-001

- Status: `planned`
- Priority: `P1`
- Component: `src/components/schedule_overlap/RespondentsList.vue`
- Problem: Export behavior, DOM measurement, resize handling, and list-state coordination are still concentrated in one large component.
- Why it matters: The respondents panel is difficult to evolve or test because several unrelated responsibilities change together.
- Acceptance criteria: Decompose the panel into clearer rendering and behavior boundaries, preserve export and layout behavior, and keep parity intact.
- Verification evidence: Not started.
- Implementation notes: Coordinate any DOM-contract changes with sidebar work tracked in `F-SCHEDULE-OVERLAP-SIDEBAR-001`.
