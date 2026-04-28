/**
 * Plugin API utilities for communicating with external plugins
 */

/** Sends an error response to a plugin */
export const sendPluginError = (
  requestId: string,
  command: string,
  errorMessage: string
): void => {
  window.postMessage(
    {
      type: "FILL_CALENDAR_EVENT_RESPONSE",
      command,
      requestId,
      ok: false,
      error: {
        message: errorMessage,
      },
    },
    "*"
  )
}

/** Sends a success response to a plugin */
export const sendPluginSuccess = (
  requestId: string,
  command: string,
  payload: unknown = null
): void => {
  const response: Record<string, unknown> = {
    type: "FILL_CALENDAR_EVENT_RESPONSE",
    command,
    requestId,
    ok: true,
  }

  if (payload !== null) {
    response.payload = payload
  }

  window.postMessage(response, "*")
}

/** Validates that a plugin message has the required structure */
export const isValidPluginMessage = (
  event: MessageEvent | null | undefined
): boolean => {
  const data = event?.data as { type?: unknown } | undefined
  return data?.type === "FILL_CALENDAR_EVENT"
}
