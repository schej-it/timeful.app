import type { Component, Directive } from "vue"

interface FormValidationResult {
  valid: boolean
}

interface FormRefMethods {
  validate: () => Promise<FormValidationResult>
  resetValidation: () => void
}

type ComponentStubValue = boolean | Component | Directive

export type ComponentStubMap = Record<string, ComponentStubValue>

export const clickButtonStub = {
  emits: ["click"],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

export const passThroughStub = {
  inheritAttrs: false,
  template: "<div><slot /></div>",
}

export const nullStub = {
  inheritAttrs: false,
  template: "<div />",
}

export const createFormStub = (
  formRefMethods: FormRefMethods
): ComponentStubValue => ({
  methods: {
    validate(): Promise<FormValidationResult> {
      return formRefMethods.validate()
    },
    resetValidation(): void {
      formRefMethods.resetValidation()
    },
  },
  template: "<form><slot /></form>",
})

export const mergeComponentStubs = (
  ...stubGroups: ComponentStubMap[]
): ComponentStubMap => {
  const merged: ComponentStubMap = {}

  for (const stubGroup of stubGroups) {
    Object.assign(merged, stubGroup)
  }

  return merged
}

export const buildEventEditorStubs = (
  formRefMethods: FormRefMethods
): ComponentStubMap =>
  mergeComponentStubs({
    "v-btn": clickButtonStub,
    "v-btn-toggle": nullStub,
    "v-card": passThroughStub,
    "v-card-actions": passThroughStub,
    "v-card-text": passThroughStub,
    "v-card-title": passThroughStub,
    "v-checkbox": nullStub,
    "v-expand-transition": passThroughStub,
    "v-form": createFormStub(formRefMethods),
    "v-icon": nullStub,
    "v-input": passThroughStub,
    "v-select": nullStub,
    "v-spacer": nullStub,
    "v-text-field": nullStub,
    "v-tooltip": nullStub,
    AlertText: nullStub,
    DatePicker: nullStub,
    EmailInput: nullStub,
    ExpandableSection: passThroughStub,
    HelpDialog: passThroughStub,
    OverflowGradient: nullStub,
    SlideToggle: nullStub,
    TimezoneSelector: nullStub,
  })

export const respondentsListStubs: ComponentStubMap = mergeComponentStubs({
  "v-avatar": true,
  "v-btn": true,
  "v-card": true,
  "v-card-actions": true,
  "v-card-text": true,
  "v-card-title": true,
  "v-dialog": true,
  "v-icon": true,
  "v-list": true,
  "v-list-item": true,
  "v-list-item-title": true,
  "v-menu": true,
  "v-select": true,
  "v-simple-checkbox": true,
  "v-spacer": true,
  "v-switch": true,
  EventOptions: true,
  OverflowGradient: true,
  UserAvatarContent: true,
})
