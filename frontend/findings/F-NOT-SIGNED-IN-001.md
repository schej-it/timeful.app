# F-NOT-SIGNED-IN-001

- Status: `fixed`
- Priority: `P2`
- Component: `src/components/groups/NotSignedIn.vue`
- Problem: Owner data is still fetched in `onMounted` from inside the view component.
- Why it matters: Data loading is tied to render lifecycle instead of an explicit boundary or parent-owned flow.
- Acceptance criteria: Move owner loading behind a clearer boundary while preserving current not-signed-in behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-23. Added route-level coverage in `src/views/Group.test.ts` and updated component coverage in `src/components/groups/NotSignedIn.test.ts` after moving owner loading into `Group.vue`.
- Implementation notes: Confirm whether the owning route already has enough context to absorb the fetch.
