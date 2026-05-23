# F-TOOLTIP-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/Tooltip.vue`
- Problem: Tooltip visibility and placement still depend on manual DOM listeners, inline style objects, timers, and mount-coupled setup.
- Why it matters: Behavior is difficult to verify and easy to regress because state ownership is split across reactivity and direct DOM orchestration.
- Acceptance criteria: Centralize placement and visibility logic behind a composable or helper, remove manual listener wiring from the view where practical, and preserve current tooltip behavior.
- Verification evidence: Not started.
- Implementation notes: Favor targeted unit coverage for placement and visibility logic before touching layout glue.
