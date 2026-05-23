// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CalendarAccount, User } from "@/types"
import { buttonStubWithDisabled, mergeComponentStubs, passThroughStub } from "@/test/componentStubs"
import InvitationDialog from "./InvitationDialog.vue"
import { cloneCalendarAccounts } from "@/components/settings/useCalendarAccountsState"

const { authUserRef, post, push, replace } = vi.hoisted(() => ({
  authUserRef: { value: null as User | null },
  post: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push,
    replace,
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    authUser: authUserRef,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({}),
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: ref(false),
  }),
}))

vi.mock("@/composables/event/eventOwnership", () => ({
  isSignedInOwner: vi.fn(() => false),
}))

vi.mock("@/utils", () => {
  return {
    post,
    generateEnabledCalendarsPayload: (
      calendarAccounts: Record<string, CalendarAccount>
    ) => ({
      guest: false,
      useCalendarAvailability: true,
      enabledCalendars: Object.fromEntries(
        Object.entries(calendarAccounts)
          .filter(([, account]) => account.enabled)
          .map(([accountId, account]) => [
            accountId,
            Object.entries(account.subCalendars ?? {})
              .filter(([, subCalendar]) => subCalendar.enabled)
              .map(([subCalendarId]) => subCalendarId),
          ])
      ),
    }),
  }
})

const CalendarAccountsStub = {
  emits: ["toggleCalendarAccount", "toggleSubCalendarAccount"],
  template: `
    <div>
      <button
        type="button"
        data-test="toggle-account"
        @click="$emit('toggleCalendarAccount', {
          email: 'owner@example.com',
          calendarType: 'google',
          enabled: false,
        })"
      >
        Toggle account
      </button>
      <button
        type="button"
        data-test="toggle-sub-calendar"
        @click="$emit('toggleSubCalendarAccount', {
          email: 'owner@example.com',
          calendarType: 'google',
          subCalendarId: 'sub-1',
          enabled: false,
        })"
      >
        Toggle sub calendar
      </button>
    </div>
  `,
}

const mountInvitationDialog = () =>
  mount(InvitationDialog, {
    props: {
      modelValue: true,
      calendarPermissionGranted: true,
      group: {
        _id: "group-1",
        name: "Writers room",
        attendees: [{ email: "guest@example.com" }],
      },
    },
    global: {
      stubs: mergeComponentStubs({
        CalendarAccounts: CalendarAccountsStub,
        CalendarPermissionsCard: passThroughStub,
        UserChip: passThroughStub,
        "v-btn": buttonStubWithDisabled,
        "v-card": passThroughStub,
        "v-card-actions": passThroughStub,
        "v-card-text": passThroughStub,
        "v-card-title": passThroughStub,
        "v-dialog": passThroughStub,
        "v-expand-transition": passThroughStub,
        "v-spacer": passThroughStub,
      }),
    },
  })

describe("InvitationDialog", () => {
  beforeEach(() => {
    post.mockReset()
    push.mockReset()
    replace.mockReset()
    const calendarAccounts: Record<string, CalendarAccount> = {
      "owner@example.com_google": {
        email: "owner@example.com",
        calendarType: "google",
        enabled: true,
        subCalendars: {
          "sub-1": {
            enabled: true,
            name: "Primary",
          },
        },
      },
    }

    authUserRef.value = {
      email: "owner@example.com",
      calendarAccounts,
    } satisfies User
    post.mockResolvedValue(undefined)
  })

  it("clones calendar accounts deeply enough for dialog-local mutation", () => {
    const source = authUserRef.value?.calendarAccounts
    if (source == null) {
      throw new Error("Expected seeded calendar accounts")
    }
    const cloned = cloneCalendarAccounts(source)
    const clonedAccount = cloned["owner@example.com_google"]
    const clonedSubCalendar = clonedAccount.subCalendars?.["sub-1"]
    const sourceAccount = source["owner@example.com_google"]
    const sourceSubCalendar = sourceAccount.subCalendars?.["sub-1"]

    clonedAccount.enabled = false
    clonedAccount.subCalendars = {
      ...clonedAccount.subCalendars,
      "sub-1": {
        ...clonedSubCalendar,
        enabled: false,
      },
    }

    expect(sourceAccount.enabled).toBe(true)
    expect(sourceSubCalendar?.enabled).toBe(true)
  })

  it("submits the dialog-owned calendar state without mutating the auth user", async () => {
    const wrapper = mountInvitationDialog()

    await wrapper.get('[data-test="toggle-sub-calendar"]').trigger("click")
    const acceptButton = wrapper.findAll("button").find(button =>
      button.text().includes("Accept Invitation")
    )
    if (acceptButton == null) {
      throw new Error("Missing Accept Invitation button")
    }
    await acceptButton.trigger("click")
    await flushPromises()

    expect(post).toHaveBeenCalledWith("/events/group-1/response", {
      guest: false,
      useCalendarAvailability: true,
      enabledCalendars: {
        "owner@example.com_google": [],
      },
    })
    expect(
      authUserRef.value?.calendarAccounts?.["owner@example.com_google"].subCalendars?.["sub-1"]
        .enabled
    ).toBe(true)
    expect(wrapper.emitted("refreshEvent")).toEqual([[]])
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
  })
})
