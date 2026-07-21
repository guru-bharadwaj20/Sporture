import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@shared/api";

/**
 * Pulls a user-facing message out of an unknown thrown value.
 *
 * `catch` binds `unknown`, so every handler would otherwise need its own cast
 * to reach `err.response.data.message`. Centralising it keeps that cast in one
 * place and makes validation `details` surface consistently — those are the
 * per-field messages, which are far more useful than the generic
 * "Validation failed".
 */
export const apiErrorMessage = (err: unknown, fallback = "Something went wrong"): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.details?.length) return data.details.join("\n");
    if (data?.message) return data.message;
    if (err.code === "ERR_NETWORK") return "Can't reach the server. Is it running?";

    // The server responded but said nothing useful. Axios's own message here
    // is "Request failed with status code 500", which tells the user less than
    // the caller's context-specific fallback ("Could not load events").
    return fallback;
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

/** True when the failure was an expired or missing session. */
export const isUnauthorised = (err: unknown): boolean =>
  err instanceof AxiosError && err.response?.status === 401;
