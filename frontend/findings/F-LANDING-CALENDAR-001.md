# F-LANDING-CALENDAR-001

- Status: `verified`
- Priority: `P0`
- Component: `src/components/landing/LandingPageCalendar.vue`
- Problem: Animation control depends on mount-time setup, timers, and `defineExpose({ playAnimation })`.
- Why it matters: Instance-style parent coordination makes the component harder to compose and test, and ties behavior to render timing.
- Acceptance criteria: Replace exposed imperative coordination with clearer state-driven control, keep parity with the legacy landing animation, and preserve current timing behavior.
- Verification evidence:
  - Added `src/composables/useLandingPageCalendarAnimation.ts` to replace `defineExpose({ playAnimation })` with a replay-token driven animation boundary and explicit timer cleanup.
  - Updated `src/components/landing/LandingPageCalendar.vue` to consume the composable and remove mount-coupled exposed instance control.
  - Added `src/composables/useLandingPageCalendarAnimation.test.ts` covering restart sequencing and cancellation of overlapping timer runs.
  - `npm run compare:landing-styles` completed against the active landing route; the reported landing diffs are on the existing rendered surface, while `LandingPageCalendar.vue` is currently not rendered by `Landing.vue`.
  - Ran `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit`.
- Implementation notes: Use Firefox comparator evidence for landing-page parity before and after the refactor.
