import { describe, it, expect } from "vitest";
import { emojiForSport } from "./sports";

describe("emojiForSport", () => {
  it("maps known sports", () => {
    expect(emojiForSport("Football")).toBe("⚽");
    expect(emojiForSport("Cricket")).toBe("🏏");
    expect(emojiForSport("Badminton")).toBe("🏸");
  });

  it("ignores case and surrounding whitespace", () => {
    // Sport is free text on the server, so casing is not guaranteed.
    expect(emojiForSport("  FOOTBALL ")).toBe("⚽");
    expect(emojiForSport("cricket")).toBe("🏏");
  });

  it("falls back to a generic medal for unknown sports", () => {
    expect(emojiForSport("Kabaddi")).toBe("🏅");
    expect(emojiForSport("")).toBe("🏅");
    expect(emojiForSport()).toBe("🏅");
  });

  it("never returns undefined for odd input", () => {
    // A missing glyph would render as the literal string "undefined".
    for (const input of ["", " ", "???", "constructor", "toString"]) {
      expect(typeof emojiForSport(input)).toBe("string");
      expect(emojiForSport(input).length).toBeGreaterThan(0);
    }
  });
});
