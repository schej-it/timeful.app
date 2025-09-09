<template>
  <footer class="tw-bg-green tw-p-8 tw-text-white">
    <div class="tw-mx-auto tw-max-w-7xl">
      <div class="tw-flex tw-flex-col tw-gap-8 md:tw-grid md:tw-grid-cols-4">
        <!-- Logo and Info -->
        <div>
          <div class="tw-mb-3 tw-flex tw-items-center">
            <v-icon class="tw-mr-1 tw-text-white">mdi-calendar-blank</v-icon>
            <span class="tw-text-2xl tw-font-medium">timeful</span>
          </div>
          <div class="tw-mb-6 tw-leading-snug">
            Made with 💚 by
            <a
              href="https://x.com/jonathanzliu/"
              target="_blank"
              class="tw-text-white tw-underline"
              >@jonathanzliu</a
            >
          </div>
          <div class="tw-mb-6 tw-flex tw-items-center tw-space-x-3">
            <a href="https://x.com/timeful_app" aria-label="X" target="_blank">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                class="tw-size-5 tw-fill-current tw-text-white/80 hover:tw-text-white"
              >
                <path
                  d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"
                ></path>
              </svg>
            </a>
            <a
              href="https://github.com/schej-it/timeful.app"
              aria-label="GitHub"
              target="_blank"
              ><v-icon class="tw-text-white/80 hover:tw-text-white"
                >mdi-github</v-icon
              ></a
            >
            <a
              href="https://www.linkedin.com/company/schejit"
              aria-label="LinkedIn"
              target="_blank"
              ><v-icon class="tw-text-white/80 hover:tw-text-white"
                >mdi-linkedin</v-icon
              ></a
            >
            <a
              href="https://www.reddit.com/r/timefulapp/"
              target="_blank"
              aria-label="Reddit"
              ><v-icon class="tw-text-white/80 hover:tw-text-white"
                >mdi-reddit</v-icon
              ></a
            >
            <a
              href="https://discord.gg/v6raNqYxx3"
              target="_blank"
              aria-label="Discord"
            >
              <svg
                id="Discord-Logo"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 126.644 96"
                class="tw-size-5 tw-fill-current tw-text-white/80 hover:tw-text-white"
              >
                <path
                  d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"
                />
              </svg>
            </a>
          </div>
          <a href="/privacy-policy" class="tw-text-sm">Privacy Policy</a>
        </div>
        <!-- Links -->
        <div class="tw-flex tw-flex-col tw-gap-2">
          <div class="tw-mb-1 tw-font-bold">Links</div>
          <div>
            <a href="/blog" class="tw-text-sm">Blog</a>
          </div>
          <div>
            <v-menu :nudge-bottom="10" offset-y :close-on-content-click="false">
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="tw-cursor-pointer tw-text-sm tw-text-white/80 hover:tw-text-white"
                  v-bind="attrs"
                  v-on="on"
                >
                  Support
                </span>
              </template>
              <v-card class="tw-p-3">
                <div class="tw-text-sm">
                  Email support at
                  <span class="tw-text-green tw-underline"
                    >contact@timeful.app</span
                  >
                </div>
              </v-card>
            </v-menu>
          </div>
          <div>
            <a
              href="https://forms.gle/9AgRy4PQfWfVuBnw8"
              target="_blank"
              class="tw-text-sm"
              >Give Feedback</a
            >
          </div>
        </div>
        <!-- Articles -->
        <div class="tw-flex tw-flex-col tw-gap-2">
          <div class="tw-mb-1 tw-font-bold">Articles</div>
          <div>
            <a href="/blog/schej-is-now-timeful/" class="tw-text-sm"
              >Schej is now Timeful</a
            >
          </div>
          <div>
            <a href="/blog/about/" class="tw-text-sm"
              >Welcome to the Timeful blog!</a
            >
          </div>
          <div>
            <a href="/blog/doodle/" class="tw-text-sm">Timeful vs Doodle</a>
          </div>
          <div>
            <a href="/blog/when2meet/" class="tw-text-sm"
              >Timeful vs When2meet</a
            >
          </div>
          <div>
            <a href="/blog/gcalandwhen2meet/" class="tw-text-sm"
              >How to use When2meet with Google Calendar</a
            >
          </div>
        </div>
        <!-- Reddit posts -->
        <div class="tw-flex tw-flex-col tw-gap-2">
          <div class="tw-mb-1 tw-font-bold">Reddit posts</div>
          <div>
            <a
              href="https://www.reddit.com/r/opensource/comments/1dlol7r/i_made_a_better_when2meet/"
              target="_blank"
              class="tw-text-sm"
              >I made a better when2meet</a
            >
          </div>
          <div>
            <a
              href="https://www.reddit.com/r/opensource/comments/1klu471/i_made_a_doodle_alternative/"
              target="_blank"
              class="tw-text-sm"
              >I made a Doodle alternative</a
            >
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
div:has(a) {
  @apply tw-leading-none;
}
a {
  @apply tw-text-white/80 !important;
}
a:hover {
  @apply tw-text-white !important;
}
</style>

<script>
import { mapActions } from "vuex"

export default {
  name: "Footer",
  data() {
    return {
      contractAddress: "2uHvhSasjzHm4PPAWaVpuU7yKtd4yUGYx6WK2oxutQnm",
    }
  },
  computed: {
    contractAddressTruncated() {
      return (
        this.contractAddress.slice(0, 6) +
        "..." +
        this.contractAddress.slice(-4)
      )
    },
  },
  methods: {
    ...mapActions(["showInfo"]),
    copyContractAddress() {
      navigator.clipboard
        .writeText(this.contractAddress)
        .then(() => {
          this.showInfo("Contract address copied to clipboard!")
        })
        .catch((err) => {
          console.error("Failed to copy contract address: ", err)
          // Optionally, show an error message to the user
        })
    },
  },
}
</script>
