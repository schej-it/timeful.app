# F-RESPONDENTS-LIST-001

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/schedule_overlap/RespondentsList.vue`
- Problem: Export behavior, DOM measurement, resize handling, and list-state coordination are still concentrated in one large component.
- Why it matters: The respondents panel is difficult to evolve or test because several unrelated responsibilities change together.
- Acceptance criteria: Decompose the panel into clearer rendering and behavior boundaries, preserve export and layout behavior, and keep parity intact.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Existing `src/components/schedule_overlap/RespondentsList.test.ts` coverage stayed green across the extraction, and Firefox `inspect -- --target event-respondents-panel` passed against the migrated app.
- Implementation notes: `RespondentsList.vue` now delegates export behavior, desktop sizing, and respondent ordering or selection state to `useRespondentsCsvExport.ts`, `useRespondentsListSizing.ts`, and `useRespondentsListState.ts`, while keeping the emitted parent contract and sidebar DOM surface intact.
