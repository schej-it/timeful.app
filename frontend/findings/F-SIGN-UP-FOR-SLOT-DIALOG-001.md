# F-SIGN-UP-FOR-SLOT-DIALOG-001

- Status: `planned`
- Priority: `P1`
- Component: `src/components/sign_up_form/SignUpForSlotDialog.vue`
- Problem: The dialog repeats watcher-driven reset, validation rebuilding, and `nextTick` coordination patterns from the guest flow.
- Why it matters: Shared dialog-lifecycle problems are duplicated, which increases maintenance cost and inconsistency risk.
- Acceptance criteria: Replace the duplicated watcher-driven lifecycle pattern with a clearer shared or local state model while preserving slot sign-up behavior.
- Verification evidence: Not started.
- Implementation notes: Consider solving this together with `F-GUEST-DIALOG-001` if a shared pattern emerges cleanly.
