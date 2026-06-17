# F-UPGRADE-DIALOG-002

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/pricing/UpgradeDialog.vue`
- Problem: Pricing presentation, freemium gating, analytics, and checkout coordination still live in a single large dialog component.
- Why it matters: UI work and behavior changes are coupled more tightly than they need to be, which raises regression risk.
- Acceptance criteria: Separate dialog presentation from provider-flow and gating logic while preserving pricing parity and upgrade behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Expanded coverage passed in `src/components/pricing/UpgradeDialog.test.ts`.
- Implementation notes: Pricing fetches and checkout-session creation now live behind typed helpers, while `useUpgradeDialogState` owns dialog analytics, price derivation, student-mode state, and upgrade routing so `UpgradeDialog.vue` can stay presentation-focused without changing its public contract.
