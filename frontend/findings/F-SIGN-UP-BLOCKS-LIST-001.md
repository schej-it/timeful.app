# F-SIGN-UP-BLOCKS-LIST-001

- Status: `planned`
- Priority: `P0`
- Component: `src/components/sign_up_form/SignUpBlocksList.vue`
- Problem: The list owns query-selector-based scrolling, global resize handling, imperative max-height injection, and an exposed scroll API.
- Why it matters: View behavior is tightly coupled to DOM orchestration, which makes slot-list behavior fragile across layout changes.
- Acceptance criteria: Extract scroll and sizing behavior into clearer contracts or composables, remove imperative style injection where practical, and preserve current list behavior.
- Verification evidence: Not started.
- Implementation notes: Use comparator evidence if layout-affecting changes are needed.
