import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeolocation, formatDistance } from "./useGeolocation";

describe("formatDistance", () => {
  it("returns an empty string when distance is unknown", () => {
    expect(formatDistance(undefined)).toBe("");
    expect(formatDistance(null)).toBe("");
  });

  it("rounds sub-kilometre distances to the nearest 50 m", () => {
    expect(formatDistance(120)).toBe("100 m away");
    expect(formatDistance(139)).toBe("150 m away");
    expect(formatDistance(980)).toBe("1000 m away");
  });

  it("uses one decimal between 1 and 10 km", () => {
    expect(formatDistance(3519)).toBe("3.5 km away");
    expect(formatDistance(9994)).toBe("10.0 km away");
  });

  it("uses whole kilometres beyond 10 km", () => {
    expect(formatDistance(14149)).toBe("14 km away");
    expect(formatDistance(25600)).toBe("26 km away");
  });

  it("handles zero", () => {
    expect(formatDistance(0)).toBe("0 m away");
  });
});

describe("useGeolocation", () => {
  const mockGeolocation = (impl: Partial<Geolocation>) => {
    Object.defineProperty(navigator, "geolocation", {
      value: impl,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    mockGeolocation({ getCurrentPosition: vi.fn() });
  });

  it("starts idle and does not request on mount", () => {
    const getCurrentPosition = vi.fn();
    mockGeolocation({ getCurrentPosition });

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe("idle");
    expect(result.current.coords).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("resolves coordinates on a successful request", async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: 12.9352, longitude: 77.6245 } } as GeolocationPosition)
      ),
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.coords).toEqual({ lat: 12.9352, lng: 77.6245 });
    expect(result.current.error).toBeNull();
  });

  it.each([
    [1, /permission denied/i],
    [2, /unavailable/i],
    [3, /timed out/i],
  ])("maps error code %i to a readable message", async (code, pattern) => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_s, failure) =>
        failure?.({ code } as GeolocationPositionError)
      ),
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(pattern);
    expect(result.current.coords).toBeNull();
  });

  it("falls back for an unrecognised error code", async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_s, failure) =>
        failure?.({ code: 99 } as GeolocationPositionError)
      ),
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/couldn't determine/i);
  });

  it("reports an error when the browser has no geolocation support", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/doesn't support/i);
  });

  it("clears coordinates and resets state", async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition)
      ),
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    await waitFor(() => expect(result.current.coords).not.toBeNull());

    act(() => result.current.clear());

    expect(result.current.coords).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("clears a previous error when a new request starts", async () => {
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_s, failure) => failure?.({ code: 2 } as GeolocationPositionError))
      .mockImplementationOnce((success) =>
        success({ coords: { latitude: 5, longitude: 6 } } as GeolocationPosition)
      );
    mockGeolocation({ getCurrentPosition });

    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.error).toBeNull();
  });
});
