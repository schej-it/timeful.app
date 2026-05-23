# F-CALENDAR-TYPE-SELECTOR-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/settings/CalendarTypeSelector.vue`
- Problem: Internal finite-state dialog flow is reset by a watcher mirroring `props.visible`.
- Why it matters: Local dialog state currently depends on prop mirroring instead of a clearer ownership contract.
- Acceptance criteria: Keep one clear owner for visibility and reset behavior while preserving current calendar-type selection UX.
- Verification evidence: Not started.
- Implementation notes: Avoid introducing another view-local shim; prefer an explicit dialog-state boundary.
