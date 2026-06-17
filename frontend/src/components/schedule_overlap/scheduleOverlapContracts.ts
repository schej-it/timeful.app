export interface ScheduleOverlapRespondentsPanelExposed {
  panelEl: HTMLElement | null
}

export interface ScheduleOverlapSidebarExposed {
  scrollToSignUpBlock?: (id: string) => void
  optionsSectionEl: HTMLElement | null
  respondentsPanelEl: HTMLElement | null
}
