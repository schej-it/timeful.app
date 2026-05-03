/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// Vuetify styles and other CSS imports
declare module "vuetify/styles" {}

interface Window {
  fusetag?: {
    que: (() => void)[]
    registerZone?: (id: string) => void
    pageInit?: (opts: { blockingFuseIds: string[] }) => void
    destroySticky?: () => void
  }
  enableStickyFooter?: boolean
}

interface ImportMetaEnv {
  readonly VITE_POSTHOG_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_MICROSOFT_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "color" {
  interface ColorInstance {
    alpha(): number
    red(): number
    green(): number
    blue(): number
    hex(): string
  }
  interface ColorStatic {
    (input?: string | number | number[]): ColorInstance
    rgb(r: number, g: number, b: number): ColorInstance
  }
  const Color: ColorStatic
  export default Color
}

declare module "vue-github-button" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module "vue-vimeo-player" {
  import type { DefineComponent } from "vue"
  const VueVimeoPlayer: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default VueVimeoPlayer
  export { VueVimeoPlayer as vueVimeoPlayer }
}
