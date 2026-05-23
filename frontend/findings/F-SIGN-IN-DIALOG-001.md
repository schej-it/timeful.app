# F-SIGN-IN-DIALOG-001

- Status: `planned`
- Priority: `P1`
- Component: `src/components/SignInDialog.vue`
- Problem: Provider selection, onboarding, OTP verification, validation, and resend cooldown timer orchestration still live in one dialog component.
- Why it matters: The sign-in flow is hard to modify safely because independent steps share local state and timer coordination.
- Acceptance criteria: Split flow state and timer behavior into clearer units while preserving current sign-in UX.
- Verification evidence: Not started.
- Implementation notes: Add targeted coverage for cooldown behavior and stage transitions when practical.
