# F-PRONUNCIATION-MENU-001

- Status: `fixed`
- Priority: `P2`
- Component: `src/components/PronunciationMenu.vue`
- Problem: Audio preview still uses timers and imperative media-element control through a template ref.
- Why it matters: Media behavior is more DOM-driven than necessary, which makes the component awkward to reason about.
- Acceptance criteria: Clarify the playback state model, reduce direct element control where practical, and preserve current preview behavior.
- Verification evidence: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` passed on 2026-05-24. Added `src/composables/usePronunciationMenuPlayback.test.ts` to cover animation progression, close/reset behavior, unmount cleanup, and blocked-audio playback handling.
- Implementation notes: Playback state, timer cleanup, and audio reset behavior now live in `src/composables/usePronunciationMenuPlayback.ts`, while the component keeps the existing menu template and assets.
