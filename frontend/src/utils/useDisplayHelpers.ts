import { computed, type ComputedRef } from "vue"
import { useDisplay } from "vuetify"
import { isPhone as isPhoneRaw, br as brRaw } from "./general_utils"

/**
 * Composable wrapping `useDisplay()` so components can consume
 * `isPhone` / `br()` as reactive computeds without touching
 * the framework-free helpers in `general_utils.ts`.
 */
export const useDisplayHelpers = (): {
  isPhone: ComputedRef<boolean>
  br: (breakpoint: string) => ComputedRef<boolean>
} => {
  const display = useDisplay()
  const isPhone: ComputedRef<boolean> = computed(() => isPhoneRaw(display))
  const br = (breakpoint: string): ComputedRef<boolean> =>
    computed(() => brRaw(display, breakpoint))
  return { isPhone, br }
}
