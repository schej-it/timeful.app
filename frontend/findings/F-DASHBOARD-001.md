# F-DASHBOARD-001

- Status: `fixed`
- Priority: `P2`
- Component: `src/components/home/Dashboard.vue`
- Problem: Folder open state is bootstrapped from and persisted back to `localStorage` through setup logic and watchers inside the component.
- Why it matters: Ambient browser state currently owns a cross-session dashboard behavior that should have a clearer boundary.
- Acceptance criteria: Move folder-state persistence behind an explicit boundary or composable and preserve existing dashboard behavior.
- Verification evidence:
  - Reconfirmed that `src/components/home/Dashboard.vue` directly read and wrote `localStorage` in setup through `folderOpenState` initialization plus deep watchers before this change.
  - Moved folder-open persistence behind `src/components/home/useDashboardFolderOpenState.ts`.
  - Added focused unit coverage in `src/components/home/useDashboardFolderOpenState.test.ts` for restoration, persistence, and default-open handling for newly seen folders.
  - Ran `npm run test:unit -- src/components/home/Dashboard.test.ts src/components/home/useDashboardFolderOpenState.test.ts` in `frontend` on 2026-05-23; 4 tests passed.
- Implementation notes: Kept dashboard toggle behavior and the default-open behavior for newly discovered folders while moving browser-storage ownership behind a dashboard-local composable boundary.
