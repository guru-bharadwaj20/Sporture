import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Unmount between tests so a leftover tree can't satisfy the next assertion.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

beforeEach(() => {
  localStorage.clear();
});

// jsdom implements neither of these, and Leaflet + the map components call
// them on mount. Stubbing here keeps every test file from repeating it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
