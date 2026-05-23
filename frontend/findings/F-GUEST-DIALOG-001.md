# F-GUEST-DIALOG-001

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/GuestDialog.vue`
- Problem: Open-state watchers still reset form state and rebuild validation rules, with `nextTick` coordination keeping UI in sync.
- Why it matters: Dialog lifecycle and form rules are more implicit than they should be, which makes small changes risky.
- Acceptance criteria: Replace watcher-driven reset and validation orchestration with clearer state transitions while preserving guest-flow behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-23. Existing and updated unit coverage in `src/components/GuestDialog.test.ts` now exercises the dialog with computed rule state instead of watcher-driven reset and `nextTick` validation orchestration.
- Implementation notes: Keep this aligned with the similar sign-up-for-slot dialog pattern to avoid two divergent fixes.
