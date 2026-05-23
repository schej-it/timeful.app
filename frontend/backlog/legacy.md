# Legacy

Assessment rule: most files in this list no longer contain obvious Vue 2 Options API syntax. The notes below list the legacy-style migration problems and other maintainability problems that still stand out in each file.

## `src/components/PronunciationMenu.vue`

- Template is still built directly out of raw Vuetify primitives (`v-menu`, `v-card`), so it still reads like framework-first UI code.
- Contains timer-based imperative logic.
- Hidden `<audio>` playback is still driven through a template ref with `play()`, `pause()`, and `currentTime` mutation, so media behavior remains DOM-imperative.

## `src/components/groups/InvitationDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-expand-transition`, `v-card`, `v-card-text`, `v-card-actions`, `v-btn`, ...), so it still reads like framework-first UI code.
- Uses `onMounted` to deep-clone calendar account data with `JSON.parse(JSON.stringify(...))`, which is still migration-shim state handling rather than typed domain shaping.

## `src/components/groups/NotSignedIn.vue`

- Template is still built directly out of raw Vuetify primitives (`v-fade-transition`, `v-btn`, `v-dialog`, `v-card`), so it still reads like framework-first UI code.
- Fetches owner data in `onMounted`, so data loading remains tightly coupled to render lifecycle.

## `src/components/groups/AccessDenied.vue`

- Template is still built directly out of raw Vuetify primitives (`v-img`, `v-btn`), so it still reads like framework-first UI code.

## `src/components/UserItem.vue`

- Template is still built directly out of raw Vuetify primitives (`v-container`, `v-avatar`, `v-switch`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Watcher writes directly to `localStorage` and emits from the same reactive sync path, which still reads like legacy side-effect-driven UI state.
- Also seeds `showEventNames` from `localStorage` in `onMounted`, so initialization still depends on browser storage at render-lifecycle time.

## `src/components/BottomFab.vue`

- Template is still built directly out of raw Vuetify primitives (`v-scale-transition`, `v-btn`), so it still reads like framework-first UI code.
- Relies on raw `$attrs` passthrough and Vuetify `fixed` positioning props instead of a tighter component contract.

## `src/components/CreateSpeedDial.vue`

- Template is still built directly out of raw Vuetify primitives (`v-scale-transition`, `v-speed-dial`, `v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Still uses Vuetify `fixed` positioning props.
- Declares `createGroup` and `createEvent` emits without wiring them to the action buttons.

## `src/components/landing/LandingPageHeader.vue`

- Template is still built directly out of raw Vuetify primitives (`v-menu`, `v-btn`, `v-icon`, `v-card`), so it still reads like framework-first UI code.

## `src/components/landing/LandingPageCalendar.vue`

- Template is still built directly out of raw Vuetify primitives (`v-card`), so it still reads like framework-first UI code.
- Contains timer-based imperative logic.
- Setup depends on mount-time side effects.
- Exposes an imperative child API through `defineExpose({ playAnimation })`, so parent-child coordination still reads like instance-method orchestration.

## `src/components/Tooltip.vue`

- Uses watcher-driven synchronization (1 watcher).
- Contains timer-based imperative logic.
- Setup depends on mount-time side effects.
- Manually wires DOM listeners in `onMounted` and drives tooltip placement through inline JS style objects, keeping behavior imperative.

## `src/components/UpvoteRedditSnackbar.vue`

- Template is still built directly out of raw Vuetify primitives (`v-snackbar`, `v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Route watcher controls visibility from router state plus `localStorage`, which keeps cross-cutting UI state in ad hoc watchers.

## `src/components/HelpDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-card-text`, `v-card-actions`, `v-spacer`, ...), so it still reads like framework-first UI code.

## `src/components/settings/CalendarAccount.vue`

- Template is still built directly out of raw Vuetify primitives (`v-checkbox`, `v-icon`, `v-tooltip`, `v-btn`, `v-expand-transition`), so it still reads like framework-first UI code.
- Fairly large component at about 245 lines.
- Still leans on Vuetify micro-props such as `hide-details` inside the account row, which keeps control presentation tightly coupled to framework props.

## `src/components/settings/CalendarAccounts.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-expand-transition`, `v-dialog`, `v-card`, `v-card-title`, ...), so it still reads like framework-first UI code.
- Fairly large component at about 259 lines.
- Uses watcher-driven synchronization (1 watcher).
- Picks between prop and auth-derived sources in `onMounted`, then lazily fetches event data from a watcher inside the component.
- Collapse state is also initialized from and persisted back to `localStorage`, so UI state ownership remains browser-storage-driven.

## `src/components/settings/CalendarTypeSelector.vue`

- Template is still built directly out of raw Vuetify primitives (`v-card`, `v-expand-transition`, `v-card-title`, `v-card-text`, `v-btn`, `v-img`, ...), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Watcher resets internal finite-state state from `props.visible`, which is still local dialog-state mirroring.

## `src/components/EventType.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-expand-transition`), so it still reads like framework-first UI code.

## `src/components/Footer.vue`

- Template is still built directly out of raw Vuetify primitives (`v-icon`, `v-menu`, `v-card`), so it still reads like framework-first UI code.
- Script setup still carries dead contract-address clipboard logic, kept alive with `void` expressions even though the template never uses it.

## `src/components/schedule_overlap/ScheduleOverlapMobileOverlay.vue`

- Template is still built directly out of raw Vuetify primitives (`v-expand-transition`, `v-icon`), so it still reads like framework-first UI code.
- Overlay positioning is driven through inline style binding.

## `src/components/schedule_overlap/ScheduleOverlapSidebar.vue`

- Template is still built directly out of raw Vuetify primitives (`v-icon`, `v-dialog`, `v-card`, `v-card-title`, `v-card-text`, `v-text-field`, ...), so it still reads like framework-first UI code.
- Large component at about 423 lines.
- `defineExpose` leaks scroll helpers and DOM-facing accessors.
- `respondentsPanelRef.value?.$el` is still instance-style DOM reach-in.
- Sidebar width is still pushed through an inline style binding, and several form controls still rely on Vuetify micro-props such as `hide-details`.

## `src/components/schedule_overlap/CalendarEventBlock.vue`

- Block geometry is still pushed through inline style objects.
- Template includes literal pointer-event styling.

## `src/components/schedule_overlap/ScheduleOverlap.vue`

- Very large monolithic component at about 1131 lines.
- High derived-state surface area (35 computed values).
- Very large `defineExpose` surface effectively recreates a child instance API for the parent.
- Seeds guest-name and best-times state directly from `localStorage`, so core scheduling state still depends on ambient browser storage.
- Template still carries literal inline browser styling (`-webkit-touch-callout: none`), which keeps low-level presentation details embedded in the component.

## `src/components/schedule_overlap/ColorLegend.vue`

- No notable legacy-style problems stood out beyond normal framework coupling.

## `src/components/schedule_overlap/ScheduleOverlapDaysOnlyGrid.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-expand-transition`), so it still reads like framework-first UI code.
- Layout and touch interaction still depend on inline geometry and literal touch-action styling.

## `src/components/schedule_overlap/ToolRow.vue`

- Template is still built directly out of raw Vuetify primitives (`v-select`, `v-spacer`, `v-btn`, `v-icon`, `v-menu`, `v-list`, ...), so it still reads like framework-first UI code.
- Fairly large component at about 288 lines.
- Hard-coded inline width and display styling suggests local one-off layout tuning rather than cleaner abstractions.

## `src/components/schedule_overlap/ScheduleOverlapRespondentsPanel.vue`

- No notable legacy-style problems stood out beyond normal framework coupling.

## `src/components/schedule_overlap/ConfirmDetailsDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.
- Fairly large component at about 286 lines.
- Uses watcher-driven synchronization (1 watcher).
- Contains timer-based imperative logic.
- Setup depends on mount-time side effects.
- Exposes an imperative `setData()` API.
- Runs debounced contact search directly inside the dialog component.
- Still leans on Vuetify micro-props such as `hide-details` and `item-value` inside the dialog form.

## `src/components/schedule_overlap/WorkingHoursToggle.vue`

- Template is still built directly out of raw Vuetify primitives (`v-switch`, `v-select`), so it still reads like framework-first UI code.
- Still leans on Vuetify micro-props such as `hide-details` and `item-value`, which preserves a framework-first form-control style.

## `src/components/schedule_overlap/TimezoneSelector.vue`

- Template is still built directly out of raw Vuetify primitives (`v-select`, `v-list-item`, `v-list-item-title`, `v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Fairly large component at about 327 lines.
- Uses watcher-driven synchronization (1 watcher).
- Watcher rehydrates local selection from props.
- Still relies on Vuetify micro-props such as `hide-details` and `item-value`.
- Persists selection directly to `localStorage` and rehydrates timezone state from storage during setup, so the control still spans props plus ambient browser storage.

## `src/components/schedule_overlap/ZigZag.vue`

- Post-mount JS computes visual sizing and pushes it into inline styles.

## `src/components/schedule_overlap/GCalWeekSelector.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`), so it still reads like framework-first UI code.

## `src/components/schedule_overlap/ScheduleOverlapTimeGrid.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-progress-circular`, `v-expand-transition`), so it still reads like framework-first UI code.
- Large component at about 371 lines.
- Heavy inline-style geometry drives most of the rendered layout, which keeps presentation logic embedded in the template.
- Template also embeds literal `touch-action: none` and repeated `pointer-events: none`, so low-level pointer behavior still lives directly in the markup.

## `src/components/schedule_overlap/EventOptions.vue`

- Template is still built directly out of raw Vuetify primitives (`v-switch`), so it still reads like framework-first UI code.

## `src/components/schedule_overlap/SpecificTimesInstructions.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`), so it still reads like framework-first UI code.

## `src/components/schedule_overlap/BufferTimeSwitch.vue`

- Template is still built directly out of raw Vuetify primitives (`v-switch`, `v-select`), so it still reads like framework-first UI code.
- Still relies on Vuetify micro-props such as `hide-details` and `item-value`.

## `src/components/schedule_overlap/AvailabilityTypeToggle.vue`

- No notable legacy-style problems stood out beyond normal framework coupling.

## `src/components/schedule_overlap/RespondentsList.vue`

- Template is still built directly out of raw Vuetify primitives (`v-spacer`, `v-menu`, `v-btn`, `v-icon`, `v-list`, `v-dialog`, ...), so it still reads like framework-first UI code.
- Very large monolithic component at about 890 lines.
- Uses watcher-driven synchronization (1 watcher).
- High derived-state surface area (9 computed values).
- High local state surface area (3 refs, 1 reactive object).
- Contains direct DOM/browser imperative code.
- Needs `nextTick` coordination to keep UI state aligned.
- Setup depends on mount-time side effects.
- Still uses manual anchor creation for downloads, global resize handling, DOM-measured height logic, and inline styling.

## `src/components/HowItWorksDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`), so it still reads like framework-first UI code.

## `src/components/AutoSnackbar.vue`

- Template is still built directly out of raw Vuetify primitives (`v-snackbar`, `v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Simple prop-to-local `show` mirroring watcher remains.

## `src/components/SignInGoogleBtn.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`), so it still reads like framework-first UI code.
- Literal inline display styles remain in the template.

## `src/components/NewEvent.vue`

- Template is still built directly out of raw Vuetify primitives (`v-card`, `v-card-text`, `v-form`, `v-text-field`, `v-expand-transition`, `v-select`, ...), so it still reads like framework-first UI code.
- Very large monolithic component at about 1349 lines.
- Watcher-heavy state sync (4 watchers).
- High derived-state surface area (16 computed values).
- High local state surface area (18 refs).
- Mixes DOM/browser imperative code with timer-based side effects.
- Needs `nextTick` coordination to keep UI state aligned.
- Setup depends on mount-time side effects.
- Large imperative child API via `defineExpose`.
- Uses several prop-mirroring watchers.
- Uses `window.location.reload()`.
- Persists editor preferences directly to `localStorage` (`startCalendarOnMonday`, edit reload flags), so form state still depends on ambient browser storage.
- Submit-button presentation is still pushed through an inline style object, keeping view styling logic embedded in the component.
- Leans heavily on Vuetify micro-props such as `hide-details`, `item-value`, and `menu-props`.

## `src/components/event/EventDescription.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (2 watchers).
- Needs `nextTick` coordination to keep UI state aligned.
- Edit mode is coordinated through watchers plus `nextTick` focus management, leaving dual editor state to synchronize manually.

## `src/components/event/Advertisement.vue`

- Template is still built directly out of raw Vuetify primitives (`v-img`), so it still reads like framework-first UI code.
- Contains direct DOM/browser imperative code.
- Setup depends on mount-time side effects.
- Uses mount-triggered owner fetch and `window.open()`, so behavior is still browser-imperative.

## `src/components/event/EmailInput.vue`

- Template is still built directly out of raw Vuetify primitives (`v-combobox`, `v-list-item`, `v-icon`, `v-list-item-title`, `v-list-item-subtitle`, `v-expand-transition`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (2 watchers).
- Contains timer-based imperative logic.
- Setup depends on mount-time side effects.
- Exposes an imperative `reset()` API.
- Probes permissions on mount.
- Debounces contact search locally.
- Syncs emits through watchers.
- Keeps a mixed `Contact | string` local model and mutates fetched contact objects to append `queryString`, so transport shaping is still happening inside the view component.

## `src/components/event/PubliftAd.vue`

- Uses watcher-driven synchronization (1 watcher).
- Mixes DOM/browser imperative code with timer-based side effects.
- Setup depends on mount-time side effects.
- Mutates global `window.fusetag` state and retries registration with timers.

## `src/components/event/CarbonAd.vue`

- Mixes DOM/browser imperative code with timer-based side effects.
- Setup depends on mount-time side effects.
- Manually injects a script tag and uses `querySelector`-based bootstrapping, which is still very DOM-imperative.

## `src/components/FriendItem.vue`

- Template is still built directly out of raw Vuetify primitives (`v-container`, `v-avatar`, `v-icon`), so it still reads like framework-first UI code.

## `src/components/Header.vue`

- No notable legacy-style problems stood out beyond normal framework coupling.

## `src/components/NewSignUp.vue`

- Template is still built directly out of raw Vuetify primitives (`v-card`, `v-card-text`, `v-form`, `v-text-field`, `v-expand-transition`, `v-select`, ...), so it still reads like framework-first UI code.
- Very large monolithic component at about 733 lines.
- Uses watcher-driven synchronization (2 watchers).
- High local state surface area (15 refs).
- Mixes DOM/browser imperative code with timer-based side effects.
- Needs `nextTick` coordination to keep UI state aligned.
- Setup depends on mount-time side effects.
- Uses an imperative `defineExpose` API.
- Uses watcher-driven resets.
- Uses `window.location.reload()`.
- Leans heavily on Vuetify micro-prop tuning.
- Sign-up creation flow, validation, reload behavior, and expose-based parent coordination are still concentrated in one component.

## `src/components/Logo.vue`

- Width is pushed through an inline style binding instead of a simpler class or variant contract.
- `type === "betterwhen2meet"` still falls through to the April Fools asset branch, so the public variant contract is inconsistent with what gets rendered.

## `src/components/SignInNotSupportedDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-card-text`, `v-card-actions`, `v-spacer`, ...), so it still reads like framework-first UI code.

## `src/components/CookieConsent.vue`

- Template is still built directly out of raw Vuetify primitives (`v-expand-transition`, `v-checkbox`), so it still reads like framework-first UI code.
- Contains direct DOM/browser imperative code.
- Uses `window.location.reload()` as part of the consent-state flow.
- Consent bootstrapping runs immediately in setup and persists state directly in `localStorage`, so the banner still depends on ambient browser storage rather than an explicit boundary.

## `src/components/TeamsNotReadyDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.
- Contains direct DOM/browser imperative code.
- Hard-codes browser behavior with `window.open()`.

## `src/components/CookieSettings.vue`

- Template is still built directly out of raw Vuetify primitives (`v-checkbox`), so it still reads like framework-first UI code.
- Contains direct DOM/browser imperative code.
- Setup depends on mount-time side effects.
- Uses mount-time initialization plus `window.location.reload()`, which keeps settings flow browser-imperative.

## `src/components/When2meetImportDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.

## `src/components/SlideToggle.vue`

- Uses watcher-driven synchronization (1 watcher).
- Local selected index is mirrored from `modelValue` with a watcher.
- Visual state depends heavily on inline style objects.

## `src/components/pricing/StudentProofDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-btn`), so it still reads like framework-first UI code.

## `src/components/pricing/UpgradeDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-btn`, `v-icon`, `v-fade-transition`, `v-checkbox`), so it still reads like framework-first UI code.
- Very large monolithic component at about 767 lines.
- Watcher-heavy state sync (3 watchers).
- High derived-state surface area (8 computed values).
- Contains direct DOM/browser imperative code.
- Watchers trigger analytics and init flows.
- Redirects via `window.location.href`.
- Template still leans heavily on prop-driven Vuetify tuning.
- Pricing-card presentation still depends on inline gradient and shadow style objects, so key visual styling remains embedded in the template.

## `src/components/pricing/AlreadyDonatedDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-btn`), so it still reads like framework-first UI code.

## `src/components/home/Dashboard.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-chip`, `v-menu`, `v-list`, `v-list-item`, ...), so it still reads like framework-first UI code.
- Large component at about 473 lines.
- Uses watcher-driven synchronization (2 watchers).
- Deep watcher persists folder state to `localStorage`.
- Another watcher mutates open-state to match incoming folders.
- Folder open state is also bootstrapped from `localStorage` during setup, so the component still reads ambient browser state before any explicit boundary provides it.

## `src/components/FeatureNotReadyDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.

## `src/components/SignInDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-card-text`, `v-btn`, `v-img`, ...), so it still reads like framework-first UI code.
- Large component at about 383 lines.
- High local state surface area (10 refs).
- Contains timer-based imperative logic.
- Resend cooldown is managed with a raw interval-based imperative timer.
- Provider selection, onboarding, OTP verification, and validation are still orchestrated inside one dialog component.

## `src/components/TimefulImportDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.
- Contains direct DOM/browser imperative code.
- Import validation depends directly on `window.location.hostname`.
- Writable computed state clears the form on close, so dialog visibility and import-form lifecycle are still coupled through one reactive shim.

## `src/components/DiscordBanner.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Route watcher plus `localStorage` dismissal state drive visibility.

## `src/components/AuthUserMenu.vue`

- Template is still built directly out of raw Vuetify primitives (`v-menu`, `v-btn`, `v-avatar`, `v-list`, `v-list-item`, `v-list-item-title`, ...), so it still reads like framework-first UI code.

## `src/components/GuestDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.
- Watcher-heavy state sync (3 watchers).
- Needs `nextTick` coordination to keep UI state aligned.
- Open-state watcher resets form state.
- Validation rules are rebuilt imperatively in watchers.

## `src/components/NumberBullet.vue`

- No notable legacy-style problems stood out beyond normal framework coupling.

## `src/components/FAQ.vue`

- Template is still built directly out of raw Vuetify primitives (`v-icon`, `v-expand-transition`), so it still reads like framework-first UI code.

## `src/components/sign_up_form/SignUpCalendarBlock.vue`

- Background color is injected through inline style binding.
- Availability fill color is computed ad hoc in the component as a hex-with-alpha string, so presentation logic is still embedded directly in the view.

## `src/components/sign_up_form/SignUpForSlotDialog.vue`

- Template is still built directly out of raw Vuetify primitives (`v-dialog`, `v-card`, `v-card-title`, `v-spacer`, `v-btn`, `v-icon`, ...), so it still reads like framework-first UI code.
- Watcher-heavy state sync (3 watchers).
- Needs `nextTick` coordination to keep UI state aligned.
- Follows the same watcher-driven dialog reset and validation-rule rebuilding pattern as `GuestDialog.vue`.

## `src/components/sign_up_form/SignUpBlock.vue`

- Template is still built directly out of raw Vuetify primitives (`v-btn`, `v-icon`, `v-text-field`, `v-select`, `v-avatar`), so it still reads like framework-first UI code.
- Uses watcher-driven synchronization (1 watcher).
- Immediate watcher mirrors `props.signUpBlock` into local editable refs.
- Still mixes owner editing, attendee display, and sign-up action handling in one component, so slot editing and row rendering remain tightly coupled.

## `src/components/sign_up_form/SignUpBlocksList.vue`

- Contains direct DOM/browser imperative code.
- Needs `nextTick` coordination to keep UI state aligned.
- Setup depends on mount-time side effects.
- Exposes an imperative scroll API.
- Uses `querySelector` plus manual scroll math.
- Owns global resize handling.
- Max-height is pushed through an inline CSS string with `!important`, so layout sizing still relies on imperative style injection.
