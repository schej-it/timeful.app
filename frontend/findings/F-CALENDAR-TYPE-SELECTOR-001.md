# F-CALENDAR-TYPE-SELECTOR-001

- Status: `fixed`
- Priority: `P2`
- Component: `src/components/settings/CalendarTypeSelector.vue`
- Problem: Internal finite-state dialog flow is reset by a watcher mirroring `props.visible`.
- Why it matters: Local dialog state currently depends on prop mirroring instead of a clearer ownership contract.
- Acceptance criteria: Keep one clear owner for visibility and reset behavior while preserving current calendar-type selection UX.
- Verification evidence:
  - Reconfirmed in `src/components/settings/CalendarTypeSelector.vue` that the dialog flow previously reset by watching `props.visible` and forcing the local step back to `PICK_CALENDAR` whenever visibility became false.
  - Refactored the component to keep `visible` as a session boundary only: local step state now resets on a closed-to-open transition, while nested flow ownership stays inside the selector.
  - Added `src/components/settings/CalendarTypeSelector.test.ts` coverage for provider action emits, nested `addedCalendar` forwarding, and reopening the dialog after entering a nested credential step.
  - Ran `npm run test:unit -- src/components/settings/CalendarTypeSelector.test.ts` in `frontend` on 2026-05-23; 3 tests passed.
- Implementation notes: Kept the existing `visible` prop and emitted events, but removed the reset-on-close mirroring pattern in favor of an explicit visible-session reset.
