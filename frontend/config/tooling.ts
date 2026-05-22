import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"

const frontendRootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoRootDir = path.dirname(frontendRootDir)

type ToolingMode = string
type RootEnvMode = "dev" | "prod"

interface LoadedRootEnv {
  env: Record<string, string>
  filePath: string
}

interface FrontendToolingEnv {
  devHost?: string
  devPort?: number
  apiProxyTarget?: string
  previewHost?: string
  previewPort?: number
}

interface FrontendDevServerConfig {
  host: string
  port: number
  proxy: {
    "/api": {
      target: string
      changeOrigin: true
    }
    "/swagger": {
      target: string
      changeOrigin: true
    }
  }
}

interface FrontendPlaywrightConfig {
  baseURL: string
  webServerCommand: string
  webServerPort: number
}

interface FrontendPreviewServerConfig {
  host: string
  port: number
}

function requireNonEmpty(rawValue: string | undefined, envName: string, usage: string): string {
  const value = rawValue?.trim()

  if (!value) {
    throw new Error(`Missing ${envName}. ${usage}`)
  }

  return value
}

function parsePort(rawValue: string | undefined, envName: string, usage: string): number {
  const value = requireNonEmpty(rawValue, envName, usage)
  const port = Number(value)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${envName}: "${value}". ${usage}`)
  }

  return port
}

function parseOptionalHost(rawValue: string | undefined): string | undefined {
  const value = rawValue?.trim()
  if (!value) {
    return undefined
  }

  return value
}

function parseOptionalPort(rawValue: string | undefined, envName: string): number | undefined {
  const value = rawValue?.trim()
  if (!value) {
    return undefined
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid ${envName}: "${value}". Set ${envName} to an integer between 1 and 65535.`,
    )
  }

  return port
}

function resolveRootEnvMode(mode: ToolingMode): RootEnvMode {
  return mode === "prod" || mode === "production" ? "prod" : "dev"
}

function readProcessEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

function loadRootEnv(mode: ToolingMode): LoadedRootEnv {
  const rootEnvMode = resolveRootEnvMode(mode)
  const filePath = path.join(repoRootDir, `.env.${rootEnvMode}`)
  const env = {
    ...loadEnv(rootEnvMode, repoRootDir, ""),
    ...readProcessEnv(),
  }

  return {
    env,
    filePath,
  }
}

export function getFrontendEnvDir(): string {
  return repoRootDir
}

export function loadFrontendToolingEnv(mode: ToolingMode): FrontendToolingEnv {
  const { env, filePath } = loadRootEnv(mode)
  const devUsage = `Set it in ${filePath} or export it before starting the frontend tooling.`
  const previewHost = parseOptionalHost(env.VITE_PREVIEW_HOST)
  const previewPort = parseOptionalPort(env.VITE_PREVIEW_PORT, "VITE_PREVIEW_PORT")

  if ((previewHost && previewPort === undefined) || (!previewHost && previewPort !== undefined)) {
    throw new Error(
      "Set both VITE_PREVIEW_HOST and VITE_PREVIEW_PORT together when configuring vite preview.",
    )
  }

  return {
    devHost: parseOptionalHost(env.VITE_DEV_HOST),
    devPort: parseOptionalPort(env.VITE_DEV_PORT, "VITE_DEV_PORT"),
    apiProxyTarget: parseOptionalHost(env.VITE_API_PROXY_TARGET),
    previewHost,
    previewPort,
  }
}

export function createFrontendDevServerConfig(mode: ToolingMode): FrontendDevServerConfig {
  const env = loadFrontendToolingEnv(mode)
  const rootEnvMode = resolveRootEnvMode(mode)
  const filePath = path.join(repoRootDir, `.env.${rootEnvMode}`)

  return {
    host: requireNonEmpty(
      env.devHost,
      "VITE_DEV_HOST",
      `Set VITE_DEV_HOST in ${filePath} or export it before starting the frontend tooling.`,
    ),
    port: parsePort(
      env.devPort === undefined ? undefined : String(env.devPort),
      "VITE_DEV_PORT",
      `Set VITE_DEV_PORT in ${filePath} or export it before starting the frontend tooling.`,
    ),
    proxy: {
      "/api": {
        target: requireNonEmpty(
          env.apiProxyTarget,
          "VITE_API_PROXY_TARGET",
          `Set VITE_API_PROXY_TARGET in ${filePath} or export it before starting the frontend tooling.`,
        ),
        changeOrigin: true,
      },
      "/swagger": {
        target: requireNonEmpty(
          env.apiProxyTarget,
          "VITE_API_PROXY_TARGET",
          `Set VITE_API_PROXY_TARGET in ${filePath} or export it before starting the frontend tooling.`,
        ),
        changeOrigin: true,
      },
    },
  }
}

export function createFrontendPlaywrightConfig(mode: ToolingMode): FrontendPlaywrightConfig {
  const env = loadFrontendToolingEnv(mode)
  const rootEnvMode = resolveRootEnvMode(mode)
  const filePath = path.join(repoRootDir, `.env.${rootEnvMode}`)
  const devHost = requireNonEmpty(
    env.devHost,
    "VITE_DEV_HOST",
    `Set VITE_DEV_HOST in ${filePath} or export it before starting the frontend tooling.`,
  )
  const devPort = String(
    parsePort(
      env.devPort === undefined ? undefined : String(env.devPort),
      "VITE_DEV_PORT",
      `Set VITE_DEV_PORT in ${filePath} or export it before starting the frontend tooling.`,
    ),
  )
  const baseURL = new URL(`http://${devHost}:${devPort}`)

  return {
    baseURL: baseURL.toString().replace(/\/$/, ""),
    webServerCommand: `npm run dev -- --host ${devHost} --port ${devPort}`,
    webServerPort: Number(devPort),
  }
}

export function createFrontendPreviewServerConfig(
  mode: ToolingMode,
): FrontendPreviewServerConfig | undefined {
  const env = loadFrontendToolingEnv(mode)

  if (!env.previewHost || env.previewPort === undefined) {
    return undefined
  }

  return {
    host: env.previewHost,
    port: env.previewPort,
  }
}
