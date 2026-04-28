import "vuetify/styles"
import { createVuetify } from "vuetify"
import * as directives from "vuetify/directives"

export default createVuetify({
  directives,
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#00994C",
          error: "#DB1616",
        },
      },
    },
  },
  display: {
    thresholds: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
})
