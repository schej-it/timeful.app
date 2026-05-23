# F-GUEST-DIALOG-001

- Status: `planned`
- Priority: `P1`
- Component: `src/components/GuestDialog.vue`
- Problem: Open-state watchers still reset form state and rebuild validation rules, with `nextTick` coordination keeping UI in sync.
- Why it matters: Dialog lifecycle and form rules are more implicit than they should be, which makes small changes risky.
- Acceptance criteria: Replace watcher-driven reset and validation orchestration with clearer state transitions while preserving guest-flow behavior.
- Verification evidence: Not started.
- Implementation notes: Keep this aligned with the similar sign-up-for-slot dialog pattern to avoid two divergent fixes.
