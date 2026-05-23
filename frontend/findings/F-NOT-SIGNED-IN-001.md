# F-NOT-SIGNED-IN-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/groups/NotSignedIn.vue`
- Problem: Owner data is still fetched in `onMounted` from inside the view component.
- Why it matters: Data loading is tied to render lifecycle instead of an explicit boundary or parent-owned flow.
- Acceptance criteria: Move owner loading behind a clearer boundary while preserving current not-signed-in behavior.
- Verification evidence: Not started.
- Implementation notes: Confirm whether the owning route already has enough context to absorb the fetch.
