import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@shared/api";

export const apiErrorMessage = (err: unknown, fallback = "Something went wrong"): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.details?.length) return data.details.join("\n");
    if (data?.message) return data.message;
    if (err.code === "ERR_NETWORK") return "Can't reach the server. Is it running?";

    return fallback;
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export const isUnauthorised = (err: unknown): boolean =>
  err instanceof AxiosError && err.response?.status === 401;
