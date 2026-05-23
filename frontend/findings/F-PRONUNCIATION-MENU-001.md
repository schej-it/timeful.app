# F-PRONUNCIATION-MENU-001

- Status: `planned`
- Priority: `P2`
- Component: `src/components/PronunciationMenu.vue`
- Problem: Audio preview still uses timers and imperative media-element control through a template ref.
- Why it matters: Media behavior is more DOM-driven than necessary, which makes the component awkward to reason about.
- Acceptance criteria: Clarify the playback state model, reduce direct element control where practical, and preserve current preview behavior.
- Verification evidence: Not started.
- Implementation notes: Keep this behind the higher-risk state-ownership work unless playback bugs force earlier action.
