import { createApp } from "vue"
import { createPinia } from "pinia"
import { createHead } from "@unhead/vue"
import { createGtm } from "@gtm-support/vue-gtm"
import "@mdi/font/css/materialdesignicons.css"
import "./index.css"
import "@/plugins/posthog"
import App from "./App.vue"
import router from "./router"
import vuetify from "./plugins/vuetify"

const app = createApp(App)

app.use(router)
app.use(createPinia())
app.use(vuetify)
app.use(createHead())

if (
  window.location.hostname !== "127.0.0.1" &&
  window.location.hostname !== "localhost"
) {
  app.use(createGtm({ id: "GTM-M677X6V", vueRouter: router }))
}

app.mount("#app")
