# F-NEW-EVENT-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/NewEvent.vue`
- Problem: The editor still uses `window.location.reload()` and storage-backed reload flags as part of the core event-editing flow.
- Why it matters: Reload-driven control flow obscures ownership, disrupts testability, and makes regressions more likely when the editor changes.
- Acceptance criteria: Replace reload-based flow with explicit state transitions or navigation, move persistence behind clear boundaries, and preserve event-editing behavior.
- Verification evidence: Not started.
- Implementation notes: Reconfirm the exact reload scenarios first and add regression coverage before removing them when practical.
