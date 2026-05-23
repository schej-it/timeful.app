# F-EMAIL-INPUT-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/event/EmailInput.vue`
- Problem: The component mixes `Contact | string` local state, mutates fetched contact objects, probes permissions on mount, and exposes an imperative `reset()` API.
- Why it matters: Transport shaping and async side effects currently live inside the view, which conflicts with the frontend boundary-model rules.
- Acceptance criteria: Move contact shaping and permission probing behind explicit helpers or composables, keep the component contract typed, and remove the imperative reset surface if possible.
- Verification evidence: Not started.
- Implementation notes: Read ADR 001 before implementation and add unit coverage around any extracted contact-shaping logic.
