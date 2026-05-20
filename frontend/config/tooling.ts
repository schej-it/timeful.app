import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

type ToolingMode = string

interface FrontendToolingEnv {
  devHost: string
  devPort: number
  apiProxyTarget: string
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

export function loadFrontendToolingEnv(mode: ToolingMode): FrontendToolingEnv {
  const env = loadEnv(mode, rootDir, "")
  const devUsage =
    "Set it in frontend/.env.local or export it before starting the frontend tooling."
  const previewHost = parseOptionalHost(env.VITE_PREVIEW_HOST)
  const previewPort = parseOptionalPort(env.VITE_PREVIEW_PORT, "VITE_PREVIEW_PORT")

  if ((previewHost && previewPort === undefined) || (!previewHost && previewPort !== undefined)) {
    throw new Error(
      "Set both VITE_PREVIEW_HOST and VITE_PREVIEW_PORT together when configuring vite preview.",
    )
  }

  return {
    devHost: requireNonEmpty(env.VITE_DEV_HOST, "VITE_DEV_HOST", devUsage),
    devPort: parsePort(
      env.VITE_DEV_PORT,
      "VITE_DEV_PORT",
      "Set VITE_DEV_PORT in frontend/.env.local or export it before starting the frontend tooling.",
    ),
    apiProxyTarget: requireNonEmpty(
      env.VITE_API_PROXY_TARGET,
      "VITE_API_PROXY_TARGET",
      "Set VITE_API_PROXY_TARGET in frontend/.env.local or export it before starting the frontend tooling.",
    ),
    previewHost,
    previewPort,
  }
}

export function createFrontendDevServerConfig(mode: ToolingMode): FrontendDevServerConfig {
  const env = loadFrontendToolingEnv(mode)

  return {
    host: env.devHost,
    port: env.devPort,
    proxy: {
      "/api": {
        target: env.apiProxyTarget,
        changeOrigin: true,
      },
      "/swagger": {
        target: env.apiProxyTarget,
        changeOrigin: true,
      },
    },
  }
}

export function createFrontendPlaywrightConfig(mode: ToolingMode): FrontendPlaywrightConfig {
  const env = loadFrontendToolingEnv(mode)
  const devPort = String(env.devPort)
  const baseURL = new URL(`http://${env.devHost}:${devPort}`)

  return {
    baseURL: baseURL.toString().replace(/\/$/, ""),
    webServerCommand: `npm run dev -- --host ${env.devHost} --port ${devPort}`,
    webServerPort: env.devPort,
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
