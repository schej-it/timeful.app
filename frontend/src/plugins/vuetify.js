import Vue from "vue"
import Vuetify from "vuetify/lib"
import tailwind from "../../tailwind.config"
import { prefersDarkMode } from "@/utils/general_utils"

Vue.use(Vuetify)

export default new Vuetify({
  theme: {
    dark: prefersDarkMode(),
    themes: {
      light: {
        primary: tailwind.theme.colors.green,
        error: tailwind.theme.colors.red,
      },
      dark: {
        primary: tailwind.theme.colors["light-green"],
        error: tailwind.theme.colors.red,
        background: "#1e1e1e",
        surface: "#1e1e1e",
      },
    },
  },
  breakpoint: {
    thresholds: {
      xs: 640,
      sm: 768,
      md: 1024,
      lg: 1280,
    },
    scrollBarWidth: 0,
  },
})
