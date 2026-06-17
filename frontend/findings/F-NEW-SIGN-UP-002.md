# F-NEW-SIGN-UP-002

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/NewSignUp.vue`
- Problem: The sign-up creator still combines validation, reset logic, timers, and parent coordination in one watcher-heavy component.
- Why it matters: Refactoring or extending sign-up behavior remains risky because the file owns too many concerns.
- Acceptance criteria: Decompose the flow into clearer view and state boundaries while preserving sign-up behavior.
- Verification evidence:
  - Moved shared sign-up editor ownership into `src/composables/event/useEventEditorState.ts` and reused the shared schedule builder in `src/composables/event/eventEditorSchedule.ts`.
  - Preserved `NewSignUp.vue` public props, emits, and exposed methods while removing duplicate watcher-heavy reset and hydration logic from the component.
  - Added focused regression coverage in `src/composables/event/useEventEditorState.test.ts` and `src/composables/event/eventEditorSchedule.test.ts`.
  - Passed `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit`.
- Implementation notes: Handle reload-based flow first under `F-NEW-SIGN-UP-001` so the later split is simpler.
