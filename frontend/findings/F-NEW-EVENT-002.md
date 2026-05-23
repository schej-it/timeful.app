# F-NEW-EVENT-002

- Status: `planned`
- Priority: `P1`
- Component: `src/components/NewEvent.vue`
- Problem: The event editor still mixes many watchers, refs, computed values, and child coordination responsibilities in one component.
- Why it matters: The file is too broad to maintain confidently, especially while migration parity work is still active.
- Acceptance criteria: Split the editor along stable subflows or composables, preserve behavior, and keep extracted logic covered with targeted tests.
- Verification evidence: Not started.
- Implementation notes: Resolve reload and storage ownership issues from `F-NEW-EVENT-001` before optional structural cleanup.
