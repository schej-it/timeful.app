# F-LANDING-CALENDAR-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/landing/LandingPageCalendar.vue`
- Problem: Animation control depends on mount-time setup, timers, and `defineExpose({ playAnimation })`.
- Why it matters: Instance-style parent coordination makes the component harder to compose and test, and ties behavior to render timing.
- Acceptance criteria: Replace exposed imperative coordination with clearer state-driven control, keep parity with the legacy landing animation, and preserve current timing behavior.
- Verification evidence: Not started.
- Implementation notes: Use Firefox comparator evidence for landing-page parity before and after the refactor.
