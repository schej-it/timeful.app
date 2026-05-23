# Legacy

Stable inventory for migration refactor debt. Use this file as the top-level index and keep execution detail in `../findings/*.md`.

## Legend

- Priority: `P0` core-state or ownership risk, `P1` large-flow decomposition, `P2` local cleanup with behavior risk, `P3` framework-first cleanup or abstraction follow-up
- Status: `untriaged`, `planned`, `in_progress`, `fixed`, `verified`, `wont_fix`
- Completion rule: mark a finding addressed only after the code path changed, verification evidence was captured, and both this index and the finding file were updated

## Working Rules

- Reconfirm the finding still reproduces before changing code
- Add regression coverage first when practical
- Refactor through helpers, composables, or clearer boundaries instead of view-local shims
- Use Firefox comparator evidence from `../migration/comparator` for parity-sensitive UI work
- Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:unit` for implemented fixes

## P0

- [ ] `F-USER-ITEM-001` ([finding](../findings/F-USER-ITEM-001.md)) - `planned`, `src/components/UserItem.vue`
  Local storage seeding and watcher-driven persistence still own `showEventNames` state.
- [ ] `F-LANDING-CALENDAR-001` ([finding](../findings/F-LANDING-CALENDAR-001.md)) - `planned`, `src/components/landing/LandingPageCalendar.vue`
  Animation startup still depends on mount-coupled timers and an exposed child API.
- [ ] `F-TOOLTIP-001` ([finding](../findings/F-TOOLTIP-001.md)) - `planned`, `src/components/Tooltip.vue`
  Tooltip behavior still relies on manual DOM listeners, timers, and inline placement state.
- [ ] `F-CALENDAR-ACCOUNTS-001` ([finding](../findings/F-CALENDAR-ACCOUNTS-001.md)) - `planned`, `src/components/settings/CalendarAccounts.vue`
  Data source selection, event fetching, and collapse persistence still span mount logic, watchers, and `localStorage`.
- [ ] `F-SCHEDULE-OVERLAP-001` ([finding](../findings/F-SCHEDULE-OVERLAP-001.md)) - `planned`, `src/components/schedule_overlap/ScheduleOverlap.vue`
  Core scheduling state still depends on ambient browser storage and a wide exposed instance-style API.
- [ ] `F-SCHEDULE-OVERLAP-SIDEBAR-001` ([finding](../findings/F-SCHEDULE-OVERLAP-SIDEBAR-001.md)) - `planned`, `src/components/schedule_overlap/ScheduleOverlapSidebar.vue`
  Sidebar coordination still reaches into child DOM through `$el` and exposes scroll helpers imperatively.
- [ ] `F-CONFIRM-DETAILS-001` ([finding](../findings/F-CONFIRM-DETAILS-001.md)) - `planned`, `src/components/schedule_overlap/ConfirmDetailsDialog.vue`
  Confirmation dialog still exposes `setData()` and owns debounced contact search inside the view.
- [ ] `F-TIMEZONE-SELECTOR-001` ([finding](../findings/F-TIMEZONE-SELECTOR-001.md)) - `planned`, `src/components/schedule_overlap/TimezoneSelector.vue`
  Timezone selection still mirrors props locally and persists through `localStorage` from inside the control.
- [ ] `F-NEW-EVENT-001` ([finding](../findings/F-NEW-EVENT-001.md)) - `planned`, `src/components/NewEvent.vue`
  Event editing still uses `window.location.reload()` and storage-backed reload flags in core flow.
- [ ] `F-EMAIL-INPUT-001` ([finding](../findings/F-EMAIL-INPUT-001.md)) - `planned`, `src/components/event/EmailInput.vue`
  Contact input still mixes transport shaping, mount-time permission probing, and an imperative reset API.
- [ ] `F-NEW-SIGN-UP-001` ([finding](../findings/F-NEW-SIGN-UP-001.md)) - `planned`, `src/components/NewSignUp.vue`
  Sign-up creation still couples validation, reload behavior, and expose-based parent orchestration in one flow.
- [ ] `F-COOKIE-CONSENT-001` ([finding](../findings/F-COOKIE-CONSENT-001.md)) - `planned`, `src/components/CookieConsent.vue`
  Consent state bootstrapping and accept-flow reload behavior still depend on direct browser storage and `window.location.reload()`.
- [ ] `F-COOKIE-SETTINGS-001` ([finding](../findings/F-COOKIE-SETTINGS-001.md)) - `planned`, `src/components/CookieSettings.vue`
  Settings initialization and apply flow still depend on mount-time browser reads and reloads.
- [ ] `F-UPGRADE-DIALOG-001` ([finding](../findings/F-UPGRADE-DIALOG-001.md)) - `planned`, `src/components/pricing/UpgradeDialog.vue`
  Upgrade flow still triggers analytics and redirects from watcher-driven dialog state.
- [ ] `F-TIMEFUL-IMPORT-001` ([finding](../findings/F-TIMEFUL-IMPORT-001.md)) - `planned`, `src/components/TimefulImportDialog.vue`
  Import validation still depends directly on `window.location.hostname`, and dialog close resets form state through a writable computed shim.
- [ ] `F-SIGN-UP-BLOCKS-LIST-001` ([finding](../findings/F-SIGN-UP-BLOCKS-LIST-001.md)) - `planned`, `src/components/sign_up_form/SignUpBlocksList.vue`
  Scroll behavior and max-height sizing still rely on imperative DOM queries, resize handling, and an exposed scroll API.

## P1

- [ ] `F-SCHEDULE-OVERLAP-002` ([finding](../findings/F-SCHEDULE-OVERLAP-002.md)) - `planned`, `src/components/schedule_overlap/ScheduleOverlap.vue`
  Core schedule view remains a monolith with high computed-state and coordination surface area.
- [ ] `F-RESPONDENTS-LIST-001` ([finding](../findings/F-RESPONDENTS-LIST-001.md)) - `planned`, `src/components/schedule_overlap/RespondentsList.vue`
  Respondents panel still concentrates export behavior, resize handling, DOM measurement, and view state coordination.
- [ ] `F-NEW-EVENT-002` ([finding](../findings/F-NEW-EVENT-002.md)) - `planned`, `src/components/NewEvent.vue`
  New-event editor remains watcher-heavy and too broad for maintainable ownership boundaries.
- [ ] `F-NEW-SIGN-UP-002` ([finding](../findings/F-NEW-SIGN-UP-002.md)) - `planned`, `src/components/NewSignUp.vue`
  New-sign-up flow remains a large watcher-driven component with reset and validation logic tightly coupled to the view.
- [ ] `F-UPGRADE-DIALOG-002` ([finding](../findings/F-UPGRADE-DIALOG-002.md)) - `planned`, `src/components/pricing/UpgradeDialog.vue`
  Pricing and checkout dialog still mixes presentation, gating logic, analytics, and provider-flow state in one component.
- [ ] `F-SIGN-IN-DIALOG-001` ([finding](../findings/F-SIGN-IN-DIALOG-001.md)) - `planned`, `src/components/SignInDialog.vue`
  Sign-in dialog still concentrates provider selection, onboarding, OTP flow, and cooldown timer orchestration.
- [ ] `F-GUEST-DIALOG-001` ([finding](../findings/F-GUEST-DIALOG-001.md)) - `planned`, `src/components/GuestDialog.vue`
  Guest dialog still rebuilds validation and reset logic through open-state watchers and `nextTick` coordination.
- [ ] `F-SIGN-UP-FOR-SLOT-DIALOG-001` ([finding](../findings/F-SIGN-UP-FOR-SLOT-DIALOG-001.md)) - `planned`, `src/components/sign_up_form/SignUpForSlotDialog.vue`
  Sign-up dialog repeats the same watcher-driven reset and validation orchestration pattern as the guest flow.

## P2

- [ ] `F-PRONUNCIATION-MENU-001` ([finding](../findings/F-PRONUNCIATION-MENU-001.md)) - `planned`, `src/components/PronunciationMenu.vue`
  Audio preview behavior still relies on timers and imperative media-element control.
- [ ] `F-INVITATION-DIALOG-001` ([finding](../findings/F-INVITATION-DIALOG-001.md)) - `planned`, `src/components/groups/InvitationDialog.vue`
  Calendar account cloning still uses `JSON.parse(JSON.stringify(...))` instead of explicit typed shaping.
- [ ] `F-NOT-SIGNED-IN-001` ([finding](../findings/F-NOT-SIGNED-IN-001.md)) - `planned`, `src/components/groups/NotSignedIn.vue`
  Owner loading still happens as a mount-coupled fetch inside the view component.
- [ ] `F-CALENDAR-TYPE-SELECTOR-001` ([finding](../findings/F-CALENDAR-TYPE-SELECTOR-001.md)) - `planned`, `src/components/settings/CalendarTypeSelector.vue`
  Dialog state still mirrors `props.visible` through a reset watcher instead of a clearer ownership boundary.
- [ ] `F-DASHBOARD-001` ([finding](../findings/F-DASHBOARD-001.md)) - `planned`, `src/components/home/Dashboard.vue`
  Folder open state still bootstraps from and persists back to `localStorage` inside the component.
- [ ] `F-SLIDE-TOGGLE-001` ([finding](../findings/F-SLIDE-TOGGLE-001.md)) - `planned`, `src/components/SlideToggle.vue`
  Local selection still mirrors `modelValue` through a watcher, and visual state is carried by inline style objects.

## P3 Summary Notes

These are inventory notes rather than independent findings until they justify reusable abstraction or parity work:

- Framework-first template cleanup remains common across small wrappers such as `AccessDenied.vue`, `BottomFab.vue`, `EventType.vue`, `HowItWorksDialog.vue`, `SignInGoogleBtn.vue`, `FeatureNotReadyDialog.vue`, and similar Vuetify-first components.
- View-local geometry and inline-style cleanup still appear in components such as `CalendarEventBlock.vue`, `ScheduleOverlapMobileOverlay.vue`, `ScheduleOverlapDaysOnlyGrid.vue`, `ScheduleOverlapTimeGrid.vue`, `Logo.vue`, and `sign_up_form/SignUpCalendarBlock.vue`.
- Small watcher-mirroring or route-storage glue remains in components such as `AutoSnackbar.vue`, `UpvoteRedditSnackbar.vue`, `DiscordBanner.vue`, `EventDescription.vue`, and related snackbars or banners.
