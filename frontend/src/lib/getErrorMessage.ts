import axios from "axios";

/**
 * Turn a failed request into something worth showing a person.
 *
 * The backend already sends a real message -- `{"message": "Invalid Credentials
 * Provided. "}` -- but `axios` puts that on `error.response.data` and sets
 * `error.message` to "Request failed with status code 401". Rendering
 * `error.message` therefore throws away the useful text and shows the status
 * code, which is what the login form was doing.
 *
 * Fallbacks are ordered by how much they help:
 *   1. the backend's `message`
 *   2. a per-status sentence, because "Request failed with status code 401"
 *      tells a user nothing
 *   3. the raw message as a last resort
 *   4. a generic sentence, so we never render "undefined"
 */
const BY_STATUS: Record<number, string> = {
  400: "That request could not be processed. Please check the details and try again.",
  401: "Your email or password is incorrect.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  409: "That conflicts with something that already exists.",
  422: "Please check the details you entered.",
  429: "Too many attempts. Wait a moment and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "The server is temporarily unavailable. Please try again.",
  503: "The server is temporarily unavailable. Please try again.",
  504: "The request timed out. Check your connection and try again.",
};

/** No response at all means the request never reached the server. */
const OFFLINE =
  "Could not reach the server. Check your connection and try again."

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    // The API's own message, when there is one. `extra.fields` holds DRF
    // per-field validation errors, which are more specific still.
    const data = error.response?.data as
      | { message?: unknown; extra?: { fields?: Record<string, unknown> } }
      | undefined;

    const serverMessage =
      typeof data?.message === "string" ? data.message.trim() : "";

    if (serverMessage) {
      const fields = data?.extra?.fields;
      if (fields) {
        const first = Object.values(fields)[0];
        // DRF field errors arrive as ["message"] or {0: "message"}.
        const detail = Array.isArray(first)
          ? String(first[0] ?? "")
          : typeof first === "object" && first
            ? String(Object.values(first as Record<string, unknown>)[0] ?? "")
            : "";
        if (detail) return detail;
      }
      return serverMessage;
    }

    if (status === undefined) {
      // Distinguish a dead connection from a request that timed out, because
      // the fixes differ.
      if (error.code === "ECONNABORTED") return BY_STATUS[504];
      return OFFLINE;
    }

    return BY_STATUS[status] ?? error.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong. Please try again.";
}