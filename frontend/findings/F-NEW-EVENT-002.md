# F-NEW-EVENT-002

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/NewEvent.vue`
- Problem: The event editor still mixes many watchers, refs, computed values, and child coordination responsibilities in one component.
- Why it matters: The file is too broad to maintain confidently, especially while migration parity work is still active.
- Acceptance criteria: Split the editor along stable subflows or composables, preserve behavior, and keep extracted logic covered with targeted tests.
- Verification evidence:
  - Extracted shared editor state ownership into `src/composables/event/useEventEditorState.ts`.
  - Extracted shared date/time schedule shaping into `src/composables/event/eventEditorSchedule.ts`.
  - Preserved `NewEvent.vue` public props, emits, and exposed methods while moving reset, hydration, and edit-tracking logic behind the shared composable.
  - Added focused regression coverage in `src/composables/event/useEventEditorState.test.ts` and `src/composables/event/eventEditorSchedule.test.ts`.
  - Passed `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit`.
- Implementation notes: Resolve reload and storage ownership issues from `F-NEW-EVENT-001` before optional structural cleanup.
