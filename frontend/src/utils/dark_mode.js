/** Returns the user's dark mode preference from localStorage, falling back to OS preference */
export const getDarkModePreference = () => {
  const stored = localStorage.getItem("darkMode")
  if (stored !== null) {
    return stored === "true"
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/** Saves the dark mode preference to localStorage */
export const setDarkModePreference = (isDark) => {
  localStorage.setItem("darkMode", String(isDark))
}

const LIGHT_THEME_COLOR = "#FFFFFF"
const DARK_THEME_COLOR = "#1E1E1E"

const setThemeColorMetaTags = (color) => {
  const metaNames = ["theme-color", "msapplication-navbutton-color"]
  metaNames.forEach((name) => {
    const meta = document.querySelector(`meta[name="${name}"]`)
    if (meta) {
      meta.setAttribute("content", color)
    }
  })
}

/** Applies dark mode by toggling Vuetify's theme and updating the meta theme-color */
export const applyDarkMode = (vuetify, isDark) => {
  vuetify.theme.dark = isDark
  const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
  setThemeColorMetaTags(color)

  // Keep the app shell background aligned with the selected theme.
  document.documentElement.style.backgroundColor = color
  if (document.body) {
    document.body.style.backgroundColor = color
  }
}
