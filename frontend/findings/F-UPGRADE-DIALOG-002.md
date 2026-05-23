# F-UPGRADE-DIALOG-002

- Status: `planned`
- Priority: `P1`
- Component: `src/components/pricing/UpgradeDialog.vue`
- Problem: Pricing presentation, freemium gating, analytics, and checkout coordination still live in a single large dialog component.
- Why it matters: UI work and behavior changes are coupled more tightly than they need to be, which raises regression risk.
- Acceptance criteria: Separate dialog presentation from provider-flow and gating logic while preserving pricing parity and upgrade behavior.
- Verification evidence: Not started.
- Implementation notes: Keep parity checks focused on pricing cards and major dialog states before any visual abstraction pass.
