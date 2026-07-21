import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import type { ApiErrorResponse } from "@shared/api";
import { apiErrorMessage, isUnauthorised } from "./errors";

const axiosError = (status: number, data: ApiErrorResponse): AxiosError => {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    statusText: "",
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return err;
};

describe("apiErrorMessage", () => {
  it("prefers validation details over the generic message", () => {
    const err = axiosError(400, {
      success: false,
      message: "Validation failed",
      details: ["title: must be at least 3 characters", "date: must be in the future"],
    });

    const msg = apiErrorMessage(err);
    expect(msg).toContain("title: must be at least 3 characters");
    expect(msg).toContain("date: must be in the future");
    expect(msg).not.toBe("Validation failed");
  });

  it("joins multiple details onto separate lines", () => {
    const err = axiosError(400, { success: false, message: "x", details: ["a", "b"] });
    expect(apiErrorMessage(err)).toBe("a\nb");
  });

  it("falls back to the message when there are no details", () => {
    const err = axiosError(404, { success: false, message: "Event not found" });
    expect(apiErrorMessage(err)).toBe("Event not found");
  });

  it("ignores an empty details array", () => {
    const err = axiosError(400, { success: false, message: "Bad request", details: [] });
    expect(apiErrorMessage(err)).toBe("Bad request");
  });

  it("explains a network failure rather than showing axios internals", () => {
    const err = new AxiosError("Network Error");
    err.code = "ERR_NETWORK";
    expect(apiErrorMessage(err)).toMatch(/can't reach the server/i);
  });

  it("uses a plain Error's message", () => {
    expect(apiErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("falls back for values that aren't errors at all", () => {
    expect(apiErrorMessage("a string")).toBe("Something went wrong");
    expect(apiErrorMessage(null)).toBe("Something went wrong");
    expect(apiErrorMessage(undefined)).toBe("Something went wrong");
    expect(apiErrorMessage({})).toBe("Something went wrong");
  });

  it("honours a caller-supplied fallback", () => {
    expect(apiErrorMessage(null, "Could not load events")).toBe("Could not load events");
  });

  it("uses the fallback when the response body has no message", () => {
    const err = axiosError(500, {} as ApiErrorResponse);
    expect(apiErrorMessage(err, "Server error")).toBe("Server error");
  });
});

describe("isUnauthorised", () => {
  it("is true for a 401", () => {
    expect(isUnauthorised(axiosError(401, { success: false, message: "nope" }))).toBe(true);
  });

  it("is false for other statuses", () => {
    expect(isUnauthorised(axiosError(403, { success: false, message: "nope" }))).toBe(false);
    expect(isUnauthorised(axiosError(500, { success: false, message: "nope" }))).toBe(false);
  });

  it("is false for non-axios values", () => {
    expect(isUnauthorised(new Error("boom"))).toBe(false);
    expect(isUnauthorised(null)).toBe(false);
  });
});
