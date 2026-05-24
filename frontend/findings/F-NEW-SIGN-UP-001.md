# F-NEW-SIGN-UP-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/NewSignUp.vue`
- Problem: Sign-up creation still uses reload-based behavior and expose-driven parent coordination inside the main flow.
- Why it matters: Core form transitions depend on browser-level resets and imperative coordination rather than explicit state changes.
- Acceptance criteria: Remove reload-based flow, narrow parent-child contracts, and preserve current sign-up creation behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Added edit-save coverage in `src/components/NewSignUp.test.ts` and `src/components/NewDialog.test.ts`.
- Implementation notes: Successful sign-up edits now emit an explicit refresh event so the owning dialog and event view refresh state in-process instead of relying on a page reload.
