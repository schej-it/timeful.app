import Vue from "vue"
import VueWorker from "vue-worker"
import App from "./App.vue"
import router from "./router"
import store from "./store"
import vuetify from "./plugins/vuetify"
import posthogPlugin from "./plugins/posthog"
import VueGtm from "@gtm-support/vue2-gtm"
import VueMeta from "vue-meta"
import "./index.css"

// Posthog
Vue.use(posthogPlugin)

// Google Tag Manager, only when VUE_APP_GTM_ID is set
if (process.env.VUE_APP_GTM_ID) {
  Vue.use(VueGtm, {
    id: process.env.VUE_APP_GTM_ID,
    vueRouter: router,
  })
}

// Site Metadata
Vue.use(VueMeta)

// Workers
Vue.use(VueWorker)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app")
