<template>
  <div class="tw-min-h-screen tw-bg-white tw-px-4 tw-py-8 sm:tw-py-12">
    <article class="policy tw-mx-auto tw-max-w-[68ch] tw-text-very-dark-gray">
      <router-link :to="{ name: 'landing' }" class="tw-mb-10 tw-inline-block">
        <Logo />
      </router-link>

      <div
        v-if="isDraft"
        class="tw-mb-8 tw-rounded-lg tw-border tw-border-dark-yellow/30 tw-bg-yellow tw-p-4 tw-text-sm tw-text-black"
        role="note"
      >
        This policy is a draft. The contact details below have not been filled
        in yet.
      </div>

      <h1>Privacy Policy</h1>
      <p class="tw-text-sm tw-text-dark-gray">Last updated {{ lastUpdated }}</p>

      <p>
        2bz2fill is a group availability poll. This policy explains what we
        collect when you use it, why, and what you can do about it. 2bz2fill is
        run by {{ operator }}. You can reach us at
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a
        >.
      </p>

      <h2>What we collect</h2>
      <h3>When you answer or create a poll</h3>
      <ul>
        <li>
          The name you enter, the times you mark as available or "if needed",
          and your email address if the poll asks for it.
        </li>
        <li>The poll's name, description, dates, times and settings.</li>
        <li>
          Email addresses you add for reminders or invitations, so we can send
          those emails.
        </li>
      </ul>
      <p>You don't need an account to answer or create a poll.</p>

      <h3>If you create an account</h3>
      <ul>
        <li>
          Your name, email address and profile picture, from Google or Microsoft
          if you sign in with them.
        </li>
        <li>Your settings, such as working hours and time zone.</li>
      </ul>

      <h3>If you connect a calendar</h3>
      <ul>
        <li>
          <strong>Google or Outlook:</strong> we store the access tokens those
          services give us, so we can read your calendar when you use
          2bz2fill.
        </li>
        <li>
          <strong>Apple Calendar:</strong> we store your Apple ID email and the
          app-specific password you create for us, encrypted.
        </li>
        <li><strong>ICS feed:</strong> we store the feed address you give us.</li>
      </ul>
      <p>
        We read your calendar events only to show your busy times on a poll and
        to fill in your availability. Event details are not saved to our
        database, and other people never see your events, only the
        availability you choose to submit.
      </p>
      <p>
        If you allow access to your Google contacts, we use them only to suggest
        email addresses while you type, and we don't store them.
      </p>

      <h3>Automatically</h3>
      <ul>
        <li>
          Server logs with your IP address, the page or action requested and the
          time, used to keep the service running and to investigate abuse.
        </li>
        <li>
          A daily record of which signed-in accounts were active, used to count
          users.
        </li>
        <li>
          A sign-in cookie that keeps you signed in, and small settings saved in
          your browser (for example your cookie choices).
        </li>
      </ul>
      <p>We don't run analytics or advertising trackers.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run polls and show everyone where their availability overlaps.</li>
        <li>To fill in your availability from your calendar when you ask us to.</li>
        <li>
          To send the emails you or a poll's creator set up: sign-in codes,
          reminders, invitations and response notifications.
        </li>
        <li>
          If you create an account, to send occasional news about 2bz2fill.
          Every one of these emails has an unsubscribe link.
        </li>
        <li>To keep the service secure and working.</li>
      </ul>
      <p>We don't sell your information or use it for advertising.</p>

      <h2>Google user data</h2>
      <p>
        2bz2fill's use and transfer to any other app of information received
        from Google APIs will adhere to the
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener"
          >Google API Services User Data Policy</a
        >, including the Limited Use requirements. We use Google Calendar and
        Contacts data only for the features described above, we don't use it
        for advertising, and no person reads it unless you ask us to for
        support, it's needed for security, or the law requires it.
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Other people on a poll</strong> see the name and availability
          you submit, unless the creator has chosen to show responses only to
          themselves.
        </li>
        <li>
          <strong>Service providers</strong> that run 2bz2fill for us: our
          hosting provider, our database host and our email provider. They
          process data only to provide their service to us.
        </li>
        <li>
          <strong>Authorities,</strong> if the law requires us to share it.
        </li>
      </ul>

      <h2>Keeping and deleting your information</h2>
      <ul>
        <li>
          You can delete your account in Settings. This removes your account and
          connected calendars.
        </li>
        <li>
          You can disconnect a calendar at any time in Settings, and revoke
          access from your Google or Microsoft account settings.
        </li>
        <li>
          To remove a response you gave as a guest, ask the poll's creator or
          email us.
        </li>
        <li>Server logs are kept only as long as needed to run the service.</li>
      </ul>
      <p>
        You can also email us to ask for a copy of your information or to have
        it corrected or deleted.
      </p>

      <h2>Children</h2>
      <p>2bz2fill is not meant for children under 13.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we'll update the date at the top. For
        significant changes, we'll tell signed-in users by email or in the app.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests:
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a
        >.
      </p>
    </article>
  </div>
</template>

<script>
import Logo from "@/components/Logo.vue"

// Fill these in before publishing. Until both are set, the page shows a draft notice.
// If you turn on analytics (VUE_APP_POSTHOG_API_KEY / VUE_APP_GTM_ID), update the
// "We don't run analytics" line.
const CONTACT_EMAIL = ""
const OPERATOR = ""

export default {
  name: "PrivacyPolicy",

  components: { Logo },

  metaInfo: {
    title: "Privacy Policy - 2bz2fill",
  },

  data: () => ({
    lastUpdated: "11 October 2026",
  }),

  computed: {
    isDraft() {
      return !CONTACT_EMAIL || !OPERATOR
    },
    contactEmail() {
      return CONTACT_EMAIL || "[contact email]"
    },
    operator() {
      return OPERATOR || "[your name]"
    },
  },
}
</script>

<style scoped>
.policy h1 {
  @apply tw-mb-2 tw-text-3xl tw-font-medium tw-text-black sm:tw-text-4xl;
}
.policy h2 {
  @apply tw-mb-3 tw-mt-10 tw-text-xl tw-font-medium tw-text-black;
}
.policy h3 {
  @apply tw-mb-2 tw-mt-6 tw-font-medium tw-text-black;
}
.policy p {
  @apply tw-mb-4 tw-leading-relaxed;
}
.policy ul {
  @apply tw-mb-4 tw-list-disc tw-space-y-2 tw-pl-5 tw-leading-relaxed;
}
.policy p a,
.policy li a {
  @apply tw-text-green tw-underline tw-underline-offset-2;
}
</style>
