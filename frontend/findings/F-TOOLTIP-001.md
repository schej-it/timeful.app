# F-TOOLTIP-001

- Status: `verified`
- Priority: `P0`
- Component: `src/components/Tooltip.vue`
- Problem: Tooltip visibility and placement still depend on manual DOM listeners, inline style objects, timers, and mount-coupled setup.
- Why it matters: Behavior is difficult to verify and easy to regress because state ownership is split across reactivity and direct DOM orchestration.
- Acceptance criteria: Centralize placement and visibility logic behind a composable or helper, remove manual listener wiring from the view where practical, and preserve current tooltip behavior.
- Verification evidence:
  - Added `src/composables/useTooltipState.ts` to centralize delayed visibility, pointer placement, and tooltip style derivation.
  - Updated `src/components/Tooltip.vue` to use declarative template mouse events instead of manual listener registration in lifecycle hooks.
  - Added `src/components/Tooltip.test.ts` covering the listener boundary, delayed visibility, and pointer-driven placement output.
  - Ran `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit`.
- Implementation notes: Favor targeted unit coverage for placement and visibility logic before touching layout glue.
