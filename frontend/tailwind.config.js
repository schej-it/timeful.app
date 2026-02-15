const colors = require("tailwindcss/colors")

module.exports = {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  important: true,
  darkMode: ["class", ".theme--dark"],
  theme: {
    extend: {
      fontSize: {
        xs: ["0.813rem", "1rem"],
      },
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      "pale-green": "#CDEBDC",
      "light-green": "#29BC68",
      "ligher-green": "#EBF7EF",
      green: "#00994C",
      "dark-green": "#1C7D45",
      "darkest-green": "#007F36",
      "light-blue": "#53A2FF",
      blue: "#006BE8",
      orange: "#E5A800",
      yellow: "#FFE8B8",
      "dark-yellow": "#997700",
      white: "#FFFFFF",
      "off-white": "#F2F2F2",
      black: "#000000",
      gray: "#BDBDBD",
      "dark-gray": "#6B6B6B",
      "very-dark-gray": "#4F4F4F",
      "light-gray": "#f3f4f6",
      "light-gray-stroke": "#dfdfdf",
      "avail-green": colors.emerald, // The green used for marking availability
      red: "#DB1616",

      // Semantic color tokens (auto-switch via CSS variables)
      surface: "var(--color-surface)",
      "surface-variant": "var(--color-surface-variant)",
      "surface-muted": "var(--color-surface-muted)",
      "text-primary": "var(--color-text-primary)",
      "text-secondary": "var(--color-text-secondary)",
      "text-muted": "var(--color-text-muted)",
      "border-default": "var(--color-border)",
    },
    screens: {
      sm: "640px",
      md: "768px",
      mdlg: "896px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [],
  prefix: "tw-",
  safelist: [],
}
