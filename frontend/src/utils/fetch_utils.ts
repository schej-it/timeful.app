import { serverURL, errors } from "@/constants"

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

export class FetchError extends Error {
  status?: number
  url?: string
  responseBody?: string
  parsed?: unknown
  headers?: Record<string, string>
}

/*
  Fetch utils
*/
export const get = <T = unknown>(route: string): Promise<T> => {
  return fetchMethod<T>("GET", route)
}

export const post = <T = unknown>(
  route: string,
  body: unknown = {}
): Promise<T> => {
  return fetchMethod<T>("POST", route, body)
}

export const patch = <T = unknown>(
  route: string,
  body: unknown = {}
): Promise<T> => {
  return fetchMethod<T>("PATCH", route, body)
}

export const put = <T = unknown>(
  route: string,
  body: unknown = {}
): Promise<T> => {
  return fetchMethod<T>("PUT", route, body)
}

export const _delete = <T = unknown>(
  route: string,
  body: unknown = {}
): Promise<T> => {
  return fetchMethod<T>("DELETE", route, body)
}

export const fetchMethod = async <T = unknown>(
  method: HttpMethod,
  route: string,
  body: unknown = {}
): Promise<T> => {
  /* Calls the given route with the give method and body */
  const url = serverURL + route
  const params: RequestInit = {
    method,
    credentials: "include",
  }

  if (method !== "GET") {
    params.headers = {
      "Content-Type": "application/json",
    }
    params.body = JSON.stringify(body)
  }

  const res = await fetch(url, params)
  const text = await res.text()

  // Parse JSON if text is not empty
  let returnValue: unknown
  if (text.length === 0) {
    returnValue = text
  } else {
    try {
      returnValue = JSON.parse(text)
    } catch {
      throw new FetchError(errors.JsonError)
    }
  }

  // Check if response was ok and throw a readable error if not
  if (!res.ok) {
    const snippet =
      typeof returnValue === "string"
        ? returnValue.slice(0, 500)
        : JSON.stringify(returnValue).slice(0, 500)
    const err = new FetchError(
      `HTTP ${String(res.status)} ${res.statusText} - ${snippet}`
    )
    err.status = res.status
    err.url = url
    err.responseBody = text.slice(0, 2000)
    err.parsed = returnValue
    err.headers = Object.fromEntries(res.headers.entries())
    throw err
  }

  return returnValue as T
}
