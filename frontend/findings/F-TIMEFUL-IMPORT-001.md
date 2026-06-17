# F-TIMEFUL-IMPORT-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/TimefulImportDialog.vue`
- Problem: Import validation depends directly on `window.location.hostname`, and dialog close clears form state through a writable computed shim.
- Why it matters: Environment checks and form-lifecycle rules are buried inside the dialog, which makes the flow harder to reuse and test.
- Acceptance criteria: Move environment-sensitive validation behind an explicit boundary, separate dialog visibility from form reset rules, and preserve current import behavior.
- Verification evidence: Added component coverage for the extracted import-URL validation boundary and explicit close/reset behavior in `src/components/TimefulImportDialog.test.ts`.
- Implementation notes: Extracted hostname blocking into `src/utils/timefulImport.ts` and replaced the writable computed dialog shim with explicit close and visibility handlers.
