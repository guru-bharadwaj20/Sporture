import { describe, it, expect, beforeEach } from "vitest";
import api, { API_ORIGIN, getRecommendedEvents, getEvents } from "./api";
import { setToken } from "./storage";
import type { InternalAxiosRequestConfig } from "axios";

const runRequestInterceptor = async (
  config: Partial<InternalAxiosRequestConfig> = {}
): Promise<InternalAxiosRequestConfig> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (api.interceptors.request as any).handlers[0];
  const base = { headers: {}, ...config } as InternalAxiosRequestConfig;
  return handler.fulfilled(base);
};

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("targets the configured origin under /api", () => {
    expect(api.defaults.baseURL).toBe(`${API_ORIGIN}/api`);
    expect(api.defaults.baseURL).toMatch(/\/api$/);
  });

  it("treats an explicitly empty API origin as same-origin", () => {
    const resolve = (v: string | undefined) => v ?? "http://localhost:5000";

    expect(resolve("")).toBe("");
    expect(resolve(undefined)).toBe("http://localhost:5000");
    expect(resolve("https://api.example.com")).toBe("https://api.example.com");
  });

  it("attaches the bearer token when one is stored", async () => {
    setToken("abc.def.ghi");
    const config = await runRequestInterceptor();
    expect(config.headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  it("sends no Authorization header when logged out", async () => {
    const config = await runRequestInterceptor();
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("reads the token per request, not once at module load", async () => {
    const before = await runRequestInterceptor();
    expect(before.headers.Authorization).toBeUndefined();

    setToken("fresh.token");
    const after = await runRequestInterceptor();
    expect(after.headers.Authorization).toBe("Bearer fresh.token");
  });
});

const captureParams = async (call: () => Promise<unknown>) => {
  let sent: Record<string, unknown> | undefined;
  const original = api.defaults.adapter;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.adapter = (config: any) => {
    sent = config.params;
    return Promise.resolve({
      data: {}, status: 200, statusText: "OK", headers: {}, config,
    });
  };

  try {
    await call();
  } finally {
    api.defaults.adapter = original;
  }
  return sent;
};

describe("request builders", () => {
  it("omits lat/lng from recommendations when no coords are given", async () => {
    const sent = await captureParams(() => getRecommendedEvents({ limit: 4 }));

    expect(sent).toEqual({ limit: 4 });
    expect(sent).not.toHaveProperty("lat");
    expect(sent).not.toHaveProperty("lng");
  });

  it("includes both coordinates when they are supplied", async () => {
    const sent = await captureParams(() =>
      getRecommendedEvents({ coords: { lat: 12.9, lng: 77.6 }, limit: 6 })
    );
    expect(sent).toEqual({ limit: 6, lat: 12.9, lng: 77.6 });
  });

  it("passes event search params straight through", async () => {
    const sent = await captureParams(() =>
      getEvents({ sport: "Cricket", lat: 12.9, lng: 77.6, radius: 5000 })
    );
    expect(sent).toEqual({ sport: "Cricket", lat: 12.9, lng: 77.6, radius: 5000 });
  });
});
