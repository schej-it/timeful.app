/**
 * Plugin API utilities for communicating with external plugins
 */

/**
 * Sends an error response to a plugin
 * @param {string} requestId - The request ID from the plugin
 * @param {string} command - The command name (e.g., "get-slots", "set-slots")
 * @param {string} errorMessage - The error message to send
 */
export const sendPluginError = (requestId, command, errorMessage) => {
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

/**
 * Sends a success response to a plugin
 * @param {string} requestId - The request ID from the plugin
 * @param {string} command - The command name (e.g., "get-slots", "set-slots")
 * @param {*} payload - The payload to send (optional)
 */
export const sendPluginSuccess = (requestId, command, payload = null) => {
  const response = {
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

/**
 * Validates that a plugin message has the required structure
 * @param {Object} event - The message event from the plugin
 * @returns {boolean} - Whether the message is valid
 */
export const isValidPluginMessage = (event) => {
  return event?.data?.type === "FILL_CALENDAR_EVENT"
}

