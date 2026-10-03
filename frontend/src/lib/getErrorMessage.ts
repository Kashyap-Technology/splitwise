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

/**
 * Pull the most specific message out of a DRF error body.
 *
 * The shapes that actually reach this function are not one shape. A non-field
 * validation error arrives as a bare list (`["too much"]`), a per-field error as
 * a map (`{amount: ["too much"]}`), and the custom exception handler wraps
 * either one level deeper (`{detail: {detail: [...]}}`). Only the map shape used
 * to be handled, so settlement errors like "You are paying more than you owe"
 * were swallowed and the generic "Validation error" title was shown even though
 * the real sentence was sitting in the body.
 */
function firstMessage(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstMessage(entry);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const found = firstMessage(entry);
      if (found) return found;
    }
  }

  return "";
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    // The API's own message, when there is one. `extra.fields` holds DRF
    // per-field validation errors, which are more specific still.
    const data = error.response?.data as
      | { message?: unknown; extra?: { fields?: unknown } }
      | undefined;

    const serverMessage =
      typeof data?.message === "string" ? data.message.trim() : "";

    const detail = firstMessage(data?.extra?.fields);
    if (detail) return detail;
    if (serverMessage) return serverMessage;

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