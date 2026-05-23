# F-INVITATION-DIALOG-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/groups/InvitationDialog.vue`
- Problem: Calendar account data is still deep-cloned with `JSON.parse(JSON.stringify(...))` during mount.
- Why it matters: Untyped cloning hides shape assumptions and conflicts with the repo's explicit boundary-model guidance.
- Acceptance criteria: Replace ad hoc cloning with explicit typed shaping that preserves current dialog behavior.
- Verification evidence: Not started.
- Implementation notes: Read ADR 001 before implementation.
