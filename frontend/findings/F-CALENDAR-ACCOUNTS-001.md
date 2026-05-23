# F-CALENDAR-ACCOUNTS-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/settings/CalendarAccounts.vue`
- Problem: Account-source selection, lazy event fetching, and collapse persistence are split across mount logic, a watcher, and `localStorage`.
- Why it matters: Data ownership is unclear, and storage or auth concerns leak directly into the view component.
- Acceptance criteria: Move source selection and persistence behind explicit boundaries, keep event loading behavior intact, and preserve the current settings UX.
- Verification evidence: Not started.
- Implementation notes: Reconfirm which states are event-owned versus auth-owned before decomposing the fetch flow.
