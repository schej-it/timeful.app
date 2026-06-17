# F-CALENDAR-ACCOUNTS-001

- Status: `verified`
- Priority: `P0`
- Component: `src/components/settings/CalendarAccounts.vue`
- Problem: Account-source selection, lazy event fetching, and collapse persistence are split across mount logic, a watcher, and `localStorage`.
- Why it matters: Data ownership is unclear, and storage or auth concerns leak directly into the view component.
- Acceptance criteria: Move source selection and persistence behind explicit boundaries, keep event loading behavior intact, and preserve the current settings UX.
- Verification evidence:
  - Extracted source selection, lazy event loading, and collapse persistence into `src/components/settings/useCalendarAccountsState.ts`.
  - Added regression coverage in `src/components/settings/useCalendarAccountsState.test.ts` for auth-owned versus event-owned account selection, `showCalendars` storage persistence, and lazy `/user/calendars` loading only when the caller does not provide a map.
  - Passed `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` in `frontend/` on 2026-05-23.
- Implementation notes:
  - Preserved the migrated app's empty-map fallback behavior so bare settings and invitation usages continue to read from `authUser.calendarAccounts`, while schedule-overlap ownership stays with the injected event/group map.
