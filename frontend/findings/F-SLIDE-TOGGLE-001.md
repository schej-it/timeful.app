# F-SLIDE-TOGGLE-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/SlideToggle.vue`
- Problem: Local selected state mirrors `modelValue` through a watcher, and visual state is encoded in inline style objects.
- Why it matters: The component carries both ownership ambiguity and presentation logic that would be easier to maintain through clearer contracts.
- Acceptance criteria: Simplify state ownership, reduce inline style coupling where practical, and preserve existing toggle behavior.
- Verification evidence: Not started.
- Implementation notes: Treat this as a local cleanup unless it blocks broader component reuse.
