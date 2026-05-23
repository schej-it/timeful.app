# F-INVITATION-DIALOG-001

- Status: `fixed`
- Priority: `P2`
- Component: `src/components/groups/InvitationDialog.vue`
- Problem: Calendar account data is still deep-cloned with `JSON.parse(JSON.stringify(...))` during mount.
- Why it matters: Untyped cloning hides shape assumptions and conflicts with the repo's explicit boundary-model guidance.
- Acceptance criteria: Replace ad hoc cloning with explicit typed shaping that preserves current dialog behavior.
- Verification evidence:
  - Reconfirmed that `src/components/groups/InvitationDialog.vue` cloned `authUser.calendarAccounts` with `JSON.parse(JSON.stringify(...))` during `onMounted` before this change.
  - Replaced the ad hoc clone with the typed `cloneCalendarAccounts` boundary in `src/components/settings/useCalendarAccountsState.ts`, which preserves dialog-local editability while normalizing required `enabled` ownership for the local response payload.
  - Added focused coverage in `src/components/groups/InvitationDialog.test.ts` for deep-enough clone isolation and response submission without mutating the auth-owned calendar state.
  - Ran `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` in `frontend/` on 2026-05-24; all checks passed.
- Implementation notes: Kept the dialog-local editable account shape explicit so the response payload path still receives required `enabled` and `subCalendars` values without widening the shared frontend user model.
