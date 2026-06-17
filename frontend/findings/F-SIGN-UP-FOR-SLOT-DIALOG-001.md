# F-SIGN-UP-FOR-SLOT-DIALOG-001

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/sign_up_form/SignUpForSlotDialog.vue`
- Problem: The dialog repeats watcher-driven reset, validation rebuilding, and `nextTick` coordination patterns from the guest flow.
- Why it matters: Shared dialog-lifecycle problems are duplicated, which increases maintenance cost and inconsistency risk.
- Acceptance criteria: Replace the duplicated watcher-driven lifecycle pattern with a clearer shared or local state model while preserving slot sign-up behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-23. Existing unit coverage in `src/components/sign_up_form/SignUpForSlotDialog.test.ts` passed after replacing watcher-driven reset and `nextTick` validation coordination with explicit dialog initialization and computed rule state.
- Implementation notes: Consider solving this together with `F-GUEST-DIALOG-001` if a shared pattern emerges cleanly.
