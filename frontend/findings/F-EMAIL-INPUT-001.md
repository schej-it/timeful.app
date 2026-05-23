# F-EMAIL-INPUT-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/event/EmailInput.vue`
- Problem: The component mixes `Contact | string` local state, mutates fetched contact objects, probes permissions on mount, and exposes an imperative `reset()` API.
- Why it matters: Transport shaping and async side effects currently live inside the view, which conflicts with the frontend boundary-model rules.
- Acceptance criteria: Move contact shaping and permission probing behind explicit helpers or composables, keep the component contract typed, and remove the imperative reset surface if possible.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-23. Added unit coverage in `src/components/event/EmailInput.test.ts` for parent-driven resync while the component now uses typed internal entries, extracted contact helpers/composables, and no exposed `reset()` API.
- Implementation notes: Read ADR 001 before implementation and add unit coverage around any extracted contact-shaping logic.
