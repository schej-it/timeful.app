const colors = require("tailwindcss/colors")

module.exports = {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  important: true,
  darkMode: "class",
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
      // Neutral/surface colors are backed by CSS variables (see index.css)
      // so that they automatically flip when the `dark` class is toggled,
      // without needing to touch every component that uses them. The
      // variables hold "R G B" channel triplets so tw-*/opacity modifiers
      // (e.g. tw-text-white/80) keep working via Tailwind's <alpha-value>.
      white: "rgb(var(--color-white) / <alpha-value>)",
      "off-white": "rgb(var(--color-off-white) / <alpha-value>)",
      black: "rgb(var(--color-black) / <alpha-value>)",
      gray: "rgb(var(--color-gray) / <alpha-value>)",
      "dark-gray": "rgb(var(--color-dark-gray) / <alpha-value>)",
      "very-dark-gray": "rgb(var(--color-very-dark-gray) / <alpha-value>)",
      "light-gray": "rgb(var(--color-light-gray) / <alpha-value>)",
      "light-gray-stroke": "rgb(var(--color-light-gray-stroke) / <alpha-value>)",
      "avail-green": colors.emerald, // The green used for marking availability
      red: "#DB1616",
    },
    screens: {
      sm: "640px",
      md: "768px",
      mdlg: "896px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "publift-s": "755px",
      "publift-m": "995px",
      "publift-l": "1225px",
      "publift-xl": "1475px",
    },
  },
  plugins: [],
  prefix: "tw-",
  safelist: [],
}
