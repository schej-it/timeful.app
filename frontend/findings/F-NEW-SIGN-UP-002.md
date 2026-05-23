# F-NEW-SIGN-UP-002

- Status: `planned`
- Priority: `P1`
- Component: `src/components/NewSignUp.vue`
- Problem: The sign-up creator still combines validation, reset logic, timers, and parent coordination in one watcher-heavy component.
- Why it matters: Refactoring or extending sign-up behavior remains risky because the file owns too many concerns.
- Acceptance criteria: Decompose the flow into clearer view and state boundaries while preserving sign-up behavior.
- Verification evidence: Not started.
- Implementation notes: Handle reload-based flow first under `F-NEW-SIGN-UP-001` so the later split is simpler.
