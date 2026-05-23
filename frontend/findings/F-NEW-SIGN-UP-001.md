# F-NEW-SIGN-UP-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/NewSignUp.vue`
- Problem: Sign-up creation still uses reload-based behavior and expose-driven parent coordination inside the main flow.
- Why it matters: Core form transitions depend on browser-level resets and imperative coordination rather than explicit state changes.
- Acceptance criteria: Remove reload-based flow, narrow parent-child contracts, and preserve current sign-up creation behavior.
- Verification evidence: Not started.
- Implementation notes: Confirm the exact parent integration points before changing the exposed API surface.
