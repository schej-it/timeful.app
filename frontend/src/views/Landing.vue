<template>
  <div class="tw-bg-light-gray">
    <div
      class="tw-relative tw-m-auto tw-mb-12 tw-flex tw-max-w-6xl tw-flex-col tw-px-4 sm:tw-mb-20"
    >
      <!-- Header -->
      <div class="tw-mb-16 sm:tw-mb-28">
        <div class="tw-flex tw-items-center tw-pt-5">
          <Logo type="timeful" />

          <v-spacer />

          <LandingPageHeader>
            <v-btn text @click="openHowItWorksDialog">How it works</v-btn>
            <v-btn text href="/blog">Blog</v-btn>
            <div v-if="authUser" class="tw-ml-2">
              <AuthUserMenu />
            </div>
            <v-btn v-else text :to="{ name: 'sign-in' }">Sign in</v-btn>
          </LandingPageHeader>
        </div>

        <FormerlyKnownAs />
      </div>

      <div class="tw-flex tw-flex-col tw-items-center">
        <div
          class="tw-mb-6 tw-flex tw-max-w-[26rem] tw-flex-col tw-items-center sm:tw-w-[35rem] sm:tw-max-w-none"
        >
          <div
            class="tw-mb-4 tw-flex tw-select-none tw-items-center tw-rounded-full tw-border tw-border-light-gray-stroke tw-bg-white/70 tw-px-2.5 tw-py-1.5 tw-text-sm tw-text-dark-gray"
          >
            We're open source!
            <github-button
              v-once
              class="-tw-mb-1 tw-ml-2"
              href="https://github.com/schej-it/timeful.app"
              data-show-count="true"
              aria-label="Star timeful.app on GitHub"
              >Star</github-button
            >
          </div>
          <div
            id="header"
            class="tw-mb-4 tw-text-center tw-text-2xl tw-font-medium sm:tw-text-4xl lg:tw-text-4xl xl:tw-text-5xl"
          >
            <h1>Find a time to meet</h1>
          </div>

          <div
            class="lg:tw-text-md tw-text-left tw-text-center tw-text-sm tw-text-very-dark-gray sm:tw-text-lg md:tw-text-lg xl:tw-text-lg"
          >
            Coordinate group meetings without the back and forth.
            <br class="tw-hidden sm:tw-block" />
            Integrates with your
            <v-tooltip
              top
              content-class="tw-bg-very-dark-gray tw-shadow-lg tw-opacity-100"
            >
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="tw-cursor-pointer tw-border-b tw-border-dashed tw-border-dark-gray"
                  v-bind="attrs"
                  v-on="on"
                  >calendar</span
                >
              </template>
              <span
                >Timeful allows you to autofill your availability from Google
                Calendar,<br class="tw-hidden sm:tw-block" />
                Outlook, Apple Calendar, or an ICS feed URL.</span
              > </v-tooltip
            >.
          </div>
        </div>

        <div class="tw-mb-12 tw-space-y-2">
          <v-btn
            class="tw-block tw-self-center tw-rounded-lg tw-bg-green tw-px-10 tw-text-base sm:tw-px-10 lg:tw-px-12"
            dark
            @click="authUser ? openDashboard() : (newDialog = true)"
            large
            :x-large="$vuetify.breakpoint.mdAndUp"
          >
            {{ authUser ? "Open dashboard" : "Create event" }}
          </v-btn>
          <div
            v-if="!authUser"
            class="tw-text-center tw-text-xs tw-text-dark-gray sm:tw-text-sm"
          >
            It's free! No login required.
          </div>
        </div>
        <div class="tw-relative tw-w-full">
          <!-- Green background -->
          <div
            class="tw-absolute -tw-bottom-12 tw-left-1/2 tw-h-[85%] tw-w-screen -tw-translate-x-1/2 tw-bg-green sm:-tw-bottom-20"
          ></div>

          <!-- Hero video -->
          <div
            class="tw-relative tw-z-20 tw-w-full tw-rounded-lg tw-border tw-border-light-gray-stroke tw-bg-white tw-shadow-xl sm:tw-rounded-xl md:tw-mx-auto md:tw-w-fit"
          >
            <div
              class="tw-relative tw-mx-4 tw-aspect-square md:tw-size-[700px] lg:tw-size-[800px]"
            >
              <v-img
                class="tw-absolute tw-left-0 tw-top-0 tw-z-20 tw-size-full tw-transition-opacity tw-duration-300"
                :class="{ 'tw-opacity-0': isVideoPlaying }"
                src="@/assets/img/hero.jpg"
                transition="fade-transition"
                contain
              />
              <vue-vimeo-player
                video-url="https://player.vimeo.com/video/1083205305?h=d58bef862a"
                :player-width="800"
                :player-height="800"
                :options="{
                  muted: true,
                  playsinline: true,
                  responsive: true,
                }"
                :controls="false"
                :autoplay="true"
                :loop="true"
                @play="onPlay"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- How it works -->
    <div
      id="how-it-works"
      class="tw-grid tw-place-content-center tw-px-4 tw-pt-12"
    >
      <div class="tw-mx-auto tw-flex tw-flex-col tw-gap-4">
        <div
          class="tw-mb-4 tw-text-center tw-text-2xl tw-font-medium sm:tw-text-3xl lg:tw-text-4xl"
        >
          How it works
        </div>
        <div
          v-for="(step, i) in howItWorksSteps"
          :key="i"
          class="tw-flex tw-items-center tw-gap-2"
        >
          <NumberBullet>{{ i + 1 }}</NumberBullet>
          <div class="tw-text-base tw-font-medium md:tw-text-xl">
            <div v-html="step"></div>
          </div>
        </div>
      </div>
      <div
        class="tw-mb-6 tw-mt-10 tw-text-center tw-text-3xl tw-font-medium md:tw-mb-12 md:tw-mt-20 md:tw-text-6xl"
      >
        It's that simple.
      </div>
      <v-img
        alt="schej character"
        src="@/assets/schej_character.png"
        :height="isPhone ? 200 : 300"
        transition="fade-transition"
        contain
        class="-tw-mb-12"
      />
    </div>

    <!-- Video -->
    <div
      class="tw-flex tw-justify-center tw-bg-green tw-px-4 tw-pb-12 tw-pt-24 md:tw-pb-16"
    >
      <div
        class="tw-h-[300px] tw-max-w-3xl tw-flex-1 sm:tw-h-[400px] md:tw-h-[450px]"
      >
        <iframe
          class="tw-h-full tw-w-full"
          src="https://www.youtube.com/embed/vFkBC8BrkOk?si=pF64JAIyDhom_1do"
          title="Timeful demo"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </div>

    <!-- Reddit Testimonials -->
    <div class="tw-flex tw-justify-center tw-bg-light-gray tw-py-12">
      <div class="tw-mx-4 tw-max-w-3xl tw-flex-1 sm:tw-mx-16">
        <div class="tw-text-center">
          <Header> People love us on Reddit! </Header>
          <div
            class="tw-mt-8 tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2"
          >
            <div
              v-for="(comment, index) in redditComments"
              :key="index"
              class="tw-flex tw-flex-col tw-rounded-lg tw-bg-white tw-p-4 tw-shadow-md"
              :class="{
                'sm:tw-col-span-2 sm:tw-mx-auto sm:tw-max-w-md':
                  redditComments.length % 2 !== 0 &&
                  index === redditComments.length - 1,
              }"
            >
              <div class="tw-flex tw-flex-1 tw-items-center">
                <div
                  class="reddit-comment tw-text-left tw-text-sm tw-text-very-dark-gray"
                  v-html="comment.text.replace(/\n/g, '<br />')"
                ></div>
              </div>
              <div
                class="tw-my-4 tw-h-px tw-w-full tw-bg-light-gray-stroke"
              ></div>
              <div class="tw-flex tw-items-center tw-justify-between">
                <div class="tw-text-right">
                  <a
                    :href="comment.link"
                    target="_blank"
                    class="tw-text-sm tw-font-medium tw-text-dark-gray hover:tw-underline"
                  >
                    {{ comment.author }}
                  </a>
                </div>
                <div class="tw-flex tw-items-center tw-gap-2">
                  <v-avatar size="24">
                    <v-img :src="comment.picture" />
                  </v-avatar>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="tw-flex tw-justify-center tw-pt-12">
      <div class="tw-mx-4 tw-mb-12 tw-max-w-3xl tw-flex-1 sm:tw-mx-16">
        <div id="faq-section" class="tw-text-center lg:tw-pt-3">
          <Header> Frequently Asked Questions </Header>
          <div
            class="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-text-xl lg:tw-text-2xl"
          >
            <FAQ
              v-for="faq in faqs"
              :key="faq.question"
              @signIn="signIn"
              v-bind="faq"
            />
          </div>
        </div>
      </div>
    </div>

    <Footer />

    <!-- Sign in dialog -->
    <SignInDialog
      v-model="signInDialog"
      @signIn="_signIn"
      @emailSignIn="_emailSignIn"
    />

    <!-- New event dialog -->
    <NewDialog v-model="newDialog" no-tabs @signIn="signIn" />

    <!-- Add the dialog component -->
    <HowItWorksDialog
      v-if="showHowItWorksDialog"
      v-model="showHowItWorksDialog"
    />
  </div>
</template>

<style scoped>
@media screen and (min-width: 375px) and (max-width: 640px) {
  #header {
    font-size: 1.875rem !important; /* 30px */
    line-height: 2.25rem !important; /* 36px */
  }
}
</style>
<style>
.rdt-h {
  @apply tw-rounded tw-bg-light-green/20 tw-px-px tw-text-black;
}
</style>

<script>
import LandingPageCalendar from "@/components/landing/LandingPageCalendar.vue"
import { isPhone, signInGoogle, signInOutlook } from "@/utils"
import FAQ from "@/components/FAQ.vue"
import Header from "@/components/Header.vue"
import NumberBullet from "@/components/NumberBullet.vue"
import NewEvent from "@/components/NewEvent.vue"
import NewDialog from "@/components/NewDialog.vue"
import LandingPageHeader from "@/components/landing/LandingPageHeader.vue"
import Logo from "@/components/Logo.vue"
import GithubButton from "vue-github-button"
import SignInDialog from "@/components/SignInDialog.vue"
import { calendarTypes } from "@/constants"
import HowItWorksDialog from "@/components/HowItWorksDialog.vue"
import { vueVimeoPlayer } from "vue-vimeo-player"
import Footer from "@/components/Footer.vue"
import PronunciationMenu from "@/components/PronunciationMenu.vue"
import { mapState, mapMutations } from "vuex"
import AuthUserMenu from "@/components/AuthUserMenu.vue"
import FormerlyKnownAs from "@/components/FormerlyKnownAs.vue"

export default {
  name: "Landing",

  metaInfo: {
    title: "Timeful (formerly Schej) - Find a time to meet",
  },

  components: {
    LandingPageCalendar,
    FAQ,
    Header,
    NumberBullet,
    NewEvent,
    NewDialog,
    LandingPageHeader,
    GithubButton,
    Logo,
    SignInDialog,
    HowItWorksDialog,
    vueVimeoPlayer,
    Footer,
    PronunciationMenu,
    AuthUserMenu,
    FormerlyKnownAs,
  },

  data: () => ({
    signInDialog: false,
    newDialog: false,
    githubSnackbar: true,
    howItWorksSteps: [
      "Create a Timeful event",
      "Share the Timeful link with your group for them to fill out",
      "See where everybody's availability overlaps!",
    ],
    faqs: [
      {
        question: "Does Timeful support timezones?",
        answer:
          "Yes! Timeful automatically converts all times to the viewer's local timezone. There's also a timezone selector at the bottom of every meeting poll if you would like to manually change it.",
      },
      {
        question: "How many people can respond to an event?",
        answer:
          "Unlimited! We've tested events with over 500+ responses and it works great.",
      },
      {
        question: "What calendars does Timeful integrate with?",
        answer:
          "Timeful allows you to autofill your availability from your Google Calendar, Outlook, Apple Calendar, or an ICS feed URL. We are working on adding more calendar types soon!",
      },
      {
        question: "Is calendar access required in order to use Timeful?",
        answer:
          "Nope! You can manually input your availability, but we highly recommend allowing calendar access in order to view your calendar events while doing so.",
      },
      {
        question: "Will other people be able to see my calendar events?",
        answer:
          "Nope! All other users will be able to see is the availability that you enter for an event.",
      },
      {
        question: "How do I edit my availability?",
        answer:
          'If you are signed in, simply click the "Edit availability" button. If you entered your availability as a guest, hover over your name and click the pencil icon next to it.',
      },
      {
        question: "How is Timeful different from Lettucemeet or When2meet?",
        points: [
          "Much better UI (web and mobile)",
          "Seamless and working calendar integration",
          "A slew of other features that we don't have space to list here",
        ],
      },
      {
        question: `I want it so that only I can see people's responses.`,
        answer: `Just check "Only show responses to event creator" under Advanced Options when creating your event! Other respondees will not be able to see each other's names or availability.`,
        authRequired: true,
      },
      {
        question: `Can I receive emails when someone fills out my event?`,
        answer: `Absolutely! Check "Email me each time someone joins my event" when creating an event. <br><br>To receive email notifications after a specific number (X) of responses are added, check "Email me after X responses" in Advanced Options.`,
        authRequired: true,
      },
      {
        question: `How do I send reminders to people to fill out an event?`,
        answer: `Open the "Email Reminders" section when creating an event and input everybody's email address. Reminder emails will be sent the day of event creation, one day after, and three days after. <br><br>You will also receive an email once everybody has filled out the Timeful.`,
        authRequired: true,
      },
    ],
    redditComments: [
      {
        text: "Genuinely the <span class='rdt-h'>best lightweight version of this kind of website</span> that I've come across so far, exceptional.",
        author: "u/voipClock",
        link: "https://www.reddit.com/r/opensource/comments/1klu471/comment/mt4l2ab",
        picture:
          "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
      },
      {
        text: "It's almost <span class='rdt-h'>comically easy</span> to schedule meetings with Timeful.",
        author: "u/stuffingmybrain",
        link: "https://www.reddit.com/r/schej/comments/1drs26z/comment/lb8rvty",
        picture:
          "https://styles.redditmedia.com/t5_qqojf/styles/profileIcon_snooa54a8eae-bc7f-406f-9778-b3b9dfb818e5-headshot.png?width=64&height=64&frame=1&auto=webp&crop=&s=a0a91575ff7cfc3b6698cac69da6c012c7deb8d6",
      },
      {
        text: "Timeful is everything I've ever wanted and more. On top of that, <span class='rdt-h'>community support is the best I've seen</span> of any app or software, ever.",
        author: "u/DMODD",
        link: "https://www.reddit.com/r/schej/comments/1drs26z/comment/lb8udud",
        picture:
          "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
      },
      {
        text: "With Timeful, <span class='rdt-h'>I'm very quickly able to figure out the optimal time</span> to schedule online extra help sessions before an exam.",
        author: "u/crackwurst",
        link: "https://www.reddit.com/r/schej/comments/1drs26z/comment/lb9dmbe",
        picture:
          "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_3.png",
      },
      {
        text: "Exactly what I was looking for! Clear and clean interface, also on mobile (<span class='rdt-h'>Doodle is a disaster</span>).",
        author: "u/Willem1976",
        link: "https://www.reddit.com/r/opensource/comments/1dlol7r/comment/lkn7sle",
        picture:
          "https://styles.redditmedia.com/t5_c0qtc/styles/profileIcon_snooa9d429ce-e3d9-458a-be9e-1b6dd157a209-headshot.png?width=64&height=64&frame=1&auto=webp&crop=&s=7eba44ea268928b969bcf73ee8667357412132ca",
      },
      // {
      //   text: "Thank you very much! My workplace cannot seem to pick between when2meet and Doodle and I feel like this brings the best of each into one.\n\nWell done <3",
      //   author: "u/jadiepants",
      //   link: "https://www.reddit.com/r/opensource/comments/1dlol7r/comment/m6bf3li",
      //   picture:
      //     "https://styles.redditmedia.com/t5_d7myp/styles/profileIcon_snoof50f1128-f439-433b-a6b2-8e987630e506-headshot.png?width=64&height=64&frame=1&auto=webp&crop=&s=94077bf80603c2855747f1bfc0b9dd1539fae75c",
      // },
    ],
    rive: null,
    showSchejy: false,
    showHowItWorksDialog: false,
    isVideoPlaying: false,
  }),

  computed: {
    ...mapState(["authUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
  },

  methods: {
    ...mapMutations(["setAuthUser"]),
    loadRiveAnimation() {
      // if (!this.rive) {
      //   this.rive = new Rive({
      //     src: "/rive/schej.riv",
      //     canvas: document.querySelector("canvas"),
      //     autoplay: false,
      //     stateMachines: "wave",
      //     onLoad: () => {
      //       // r.resizeDrawingSurfaceToCanvas()
      //     },
      //   })
      //   setTimeout(() => {
      //     this.showSchejy = true
      //     setTimeout(() => {
      //       this.rive.play("wave")
      //     }, 1000)
      //   }, 4000)
      // } else {
      //   this.rive.play("wave")
      // }
    },
    _signIn(calendarType) {
      if (calendarType === calendarTypes.GOOGLE) {
        signInGoogle({ state: null, selectAccount: true })
      } else if (calendarType === calendarTypes.OUTLOOK) {
        // NOTE: selectAccount is not supported implemented yet for Outlook, maybe add it later
        signInOutlook({ state: null, selectAccount: true })
      }
    },
    _emailSignIn(user) {
      this.setAuthUser(user)
      this.$posthog?.identify(user._id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })
      this.$router.replace({ name: "home" })
    },
    signIn() {
      this.$router.push({ name: "sign-in" })
    },
    openHowItWorksDialog() {
      this.showHowItWorksDialog = true
      this.$posthog.capture("how_it_works_clicked")
    },
    onPlay() {
      setTimeout(() => {
        this.isVideoPlaying = true
      }, 1000)
    },
    openDashboard() {
      this.$router.push({ name: "home" })
    },
  },

  beforeDestroy() {
    this.rive?.cleanup()
  },

  watch: {
    [`$vuetify.breakpoint.name`]: {
      immediate: true,
      handler() {
        if (this.$vuetify.breakpoint.mdAndUp) {
          setTimeout(() => {
            this.loadRiveAnimation()
          }, 0)
        }
      },
    },
  },
}
</script>
