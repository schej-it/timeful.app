# F-NEW-EVENT-001

- Status: `fixed`
- Priority: `P0`
- Component: `src/components/NewEvent.vue`
- Problem: The editor still uses `window.location.reload()` and storage-backed reload flags as part of the core event-editing flow.
- Why it matters: Reload-driven control flow obscures ownership, disrupts testability, and makes regressions more likely when the editor changes.
- Acceptance criteria: Replace reload-based flow with explicit state transitions or navigation, move persistence behind clear boundaries, and preserve event-editing behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed in `frontend/`. Added edit-save coverage in `src/components/NewEvent.test.ts` and `src/components/NewDialog.test.ts`.
- Implementation notes: Successful event edits now emit an explicit refresh event instead of writing `from-edit-event-*` storage flags and calling `window.location.reload()`. `Event.vue` refreshes the loaded event in-process and remounts `ScheduleOverlap` when specific-times state needs to be reseeded.
