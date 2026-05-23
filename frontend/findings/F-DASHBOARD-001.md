# F-DASHBOARD-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/home/Dashboard.vue`
- Problem: Folder open state is bootstrapped from and persisted back to `localStorage` through setup logic and watchers inside the component.
- Why it matters: Ambient browser state currently owns a cross-session dashboard behavior that should have a clearer boundary.
- Acceptance criteria: Move folder-state persistence behind an explicit boundary or composable and preserve existing dashboard behavior.
- Verification evidence: Not started.
- Implementation notes: Add targeted coverage around folder open-state restoration if practical.
