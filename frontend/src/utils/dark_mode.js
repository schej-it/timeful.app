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

/** Applies dark mode by toggling Vuetify's theme and updating the meta theme-color */
export const applyDarkMode = (vuetify, isDark) => {
  vuetify.theme.dark = isDark
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute("content", isDark ? "#1E1E1E" : "#FFFFFF")
  }
}
