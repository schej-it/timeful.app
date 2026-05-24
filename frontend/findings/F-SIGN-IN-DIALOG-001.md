# F-SIGN-IN-DIALOG-001

- Status: `fixed`
- Priority: `P1`
- Component: `src/components/SignInDialog.vue`
- Problem: Provider selection, onboarding, OTP verification, validation, and resend cooldown timer orchestration still live in one dialog component.
- Why it matters: The sign-in flow is hard to modify safely because independent steps share local state and timer coordination.
- Acceptance criteria: Split flow state and timer behavior into clearer units while preserving current sign-in UX.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-24. Added `src/composables/useSignInDialogState.test.ts` for cooldown, close/reset, unmount cleanup, and successful verification callbacks, and updated `src/components/SignInDialog.test.ts` to keep the existing component contract covered.
- Implementation notes: The dialog now delegates OTP step state, validation, resend cooldown ownership, and verification flow to `src/composables/useSignInDialogState.ts`, leaving the component focused on rendering and emits.
