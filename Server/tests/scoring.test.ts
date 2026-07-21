import { describe, it, expect } from "vitest";
import {
  sportAffinity,
  proximityScore,
  skillMatch,
  socialSignal,
  urgencyScore,
  scoreEvent,
  rankEvents,
  WEIGHTS,
  type ScorableEvent,
  type ScoringUser,
} from "../services/recommendations.js";

describe("sportAffinity", () => {
  it("scores a favourite sport highest", () => {
    expect(sportAffinity(["Football", "Cricket"], "Football")).toBe(1);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(sportAffinity(["  FOOTBALL "], "football")).toBe(1);
  });

  it("scores a non-favourite low but not zero", () => {
    const s = sportAffinity(["Football"], "Tennis");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(0.3);
  });

  it("stays neutral when the user has no stated favourites", () => {
    expect(sportAffinity([], "Tennis")).toBe(0.5);
    expect(sportAffinity(undefined, "Tennis")).toBe(0.5);
  });
});

describe("proximityScore", () => {
  it("scores a co-located event at 1", () => {
    expect(proximityScore(0)).toBe(1);
  });

  it("halves at each 5 km", () => {
    expect(proximityScore(5000)).toBeCloseTo(0.5, 5);
    expect(proximityScore(10000)).toBeCloseTo(0.25, 5);
    expect(proximityScore(15000)).toBeCloseTo(0.125, 5);
  });

  it("decreases monotonically with distance", () => {
    const scores = [0, 1000, 5000, 20000, 50000].map((d) => proximityScore(d));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeLessThan(scores[i - 1]!);
    }
  });

  it("stays neutral when distance is unknown", () => {
    expect(proximityScore(undefined)).toBe(0.5);
    expect(proximityScore(null)).toBe(0.5);
  });

  it("never leaves the [0, 1] range", () => {
    for (const d of [0, 1, 5000, 1e6]) {
      const s = proximityScore(d);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("skillMatch", () => {
  it("scores an exact match at 1", () => {
    expect(skillMatch("Intermediate", "Intermediate")).toBe(1);
  });

  it("treats levels as ordinal, not just equal/unequal", () => {
    const oneApart = skillMatch("Beginner", "Intermediate");
    const threeApart = skillMatch("Beginner", "Professional");
    expect(oneApart).toBeGreaterThan(threeApart);
  });

  it("is symmetric", () => {
    expect(skillMatch("Beginner", "Advanced")).toBe(skillMatch("Advanced", "Beginner"));
  });

  it("stays neutral for an unknown level", () => {
    expect(skillMatch("Beginner", undefined)).toBe(0.5);
    expect(skillMatch("Nonsense", "Beginner")).toBe(0.5);
  });
});

describe("socialSignal", () => {
  it("is zero with no shared history", () => {
    expect(socialSignal(new Set(["a"]), ["x", "y"])).toBe(0);
    expect(socialSignal(new Set(), ["x"])).toBe(0);
  });

  it("rewards knowing someone in the group", () => {
    expect(socialSignal(new Set(["a"]), ["a", "x", "y"])).toBeGreaterThan(0);
  });

  it("increases with more familiar faces", () => {
    const one = socialSignal(new Set(["a"]), ["a", "x", "y", "z", "w", "v"]);
    const three = socialSignal(new Set(["a", "x", "y"]), ["a", "x", "y", "z", "w", "v"]);
    expect(three).toBeGreaterThan(one);
  });

  it("saturates at 1", () => {
    const all = socialSignal(new Set(["a", "b", "c"]), ["a", "b", "c"]);
    expect(all).toBeLessThanOrEqual(1);
  });

  it("compares ids as strings, since Mongo returns ObjectIds", () => {
    const objectIdLike = { toString: () => "abc123" };
    expect(socialSignal(new Set(["abc123"]), [objectIdLike])).toBeGreaterThan(0);
  });
});

describe("urgencyScore", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

  it("is zero for an event in the past", () => {
    expect(urgencyScore(2, 10, inDays(-1), now)).toBe(0);
  });

  it("is zero for a full event", () => {
    expect(urgencyScore(10, 10, inDays(3), now)).toBe(0);
  });

  it("prefers sooner events over distant ones", () => {
    const soon = urgencyScore(6, 10, inDays(2), now);
    const later = urgencyScore(6, 10, inDays(30), now);
    expect(soon).toBeGreaterThan(later);
  });

  it("prefers a partly-filled event over an empty one", () => {
    const empty = urgencyScore(0, 10, inDays(3), now);
    const twoThirds = urgencyScore(7, 10, inDays(3), now);
    expect(twoThirds).toBeGreaterThan(empty);
  });

  it("never leaves the [0, 1] range", () => {
    const cases: Array<[number, number, number]> = [[0, 10, 0], [5, 10, 1], [9, 10, 60], [0, 2, 365]];
    for (const [taken, max, days] of cases) {
      const s = urgencyScore(taken, max, inDays(days), now);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

const now = new Date("2026-01-01T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

const makeEvent = (over: Partial<ScorableEvent> = {}): ScorableEvent => ({
  _id: "e1",
  title: "Test Event",
  sport: "Football",
  date: inDays(3),
  maxPlayers: 10,
  currentPlayers: ["p1", "p2"],
  createdBy: { _id: "h1", name: "Host", skillLevel: "Intermediate" },
  distanceMetres: 2000,
  ...over,
});

const user: ScoringUser = { favSports: ["Football"], skillLevel: "Intermediate" };

describe("scoreEvent", () => {
  it("returns a score inside [0, 1]", () => {
    const { score } = scoreEvent(makeEvent(), user, { now });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("exposes every signal in the breakdown", () => {
    const { breakdown } = scoreEvent(makeEvent(), user, { now });
    expect(Object.keys(breakdown).sort()).toEqual(
      ["proximity", "skill", "social", "sport", "urgency"]
    );
  });

  it("scores an ideal event above a poor one", () => {
    const ideal = scoreEvent(
      makeEvent({ sport: "Football", distanceMetres: 300, currentPlayers: ["p1", "p2", "p3", "p4", "p5", "p6"] }),
      user,
      { now }
    );
    const poor = scoreEvent(
      makeEvent({ sport: "Chess", distanceMetres: 45000, createdBy: { skillLevel: "Professional" }, date: inDays(60) }),
      user,
      { now }
    );
    expect(ideal.score).toBeGreaterThan(poor.score);
  });

  it("is deterministic", () => {
    const a = scoreEvent(makeEvent(), user, { now });
    const b = scoreEvent(makeEvent(), user, { now });
    expect(a.score).toBe(b.score);
  });

  it("explains a favourite-sport match", () => {
    const { reasons } = scoreEvent(makeEvent({ sport: "Football" }), user, { now });
    expect(reasons.join(" ")).toMatch(/favourite/i);
  });

  it("explains proximity for a nearby event", () => {
    const { reasons } = scoreEvent(makeEvent({ distanceMetres: 800 }), user, { now });
    expect(reasons.join(" ")).toMatch(/away/i);
  });

  it("mentions familiar players when there is shared history", () => {
    const { reasons } = scoreEvent(makeEvent({ currentPlayers: ["p1", "p2"] }), user, {
      now,
      pastTeammateIds: new Set(["p1"]),
    });
    expect(reasons.join(" ")).toMatch(/played with 1 person/i);
  });

  it("gives no proximity reason when distance is unknown", () => {
    const { reasons } = scoreEvent(makeEvent({ distanceMetres: undefined }), user, { now });
    expect(reasons.join(" ")).not.toMatch(/away/i);
  });

  it("handles a host with no skill level set", () => {
    const ev = makeEvent({ createdBy: { _id: "h1", name: "Host" } });
    expect(() => scoreEvent(ev, user, { now })).not.toThrow();
    expect(scoreEvent(ev, user, { now }).breakdown.skill).toBe(0.5);
  });

  it("handles a user with no preferences at all", () => {
    const blank: ScoringUser = { favSports: [] };
    const { score } = scoreEvent(makeEvent(), blank, { now });
    expect(Number.isFinite(score)).toBe(true);
  });

  it("weights sport affinity above urgency", () => {
    expect(WEIGHTS.sport).toBeGreaterThan(WEIGHTS.urgency);
  });
});

describe("rankEvents", () => {
  it("orders by descending score", () => {
    const events = [
      makeEvent({ _id: "far", sport: "Chess", distanceMetres: 40000 }),
      makeEvent({ _id: "near", sport: "Football", distanceMetres: 200 }),
      makeEvent({ _id: "mid", sport: "Football", distanceMetres: 12000 }),
    ];

    const ranked = rankEvents(events, user, { now });
    expect(ranked.map((e: any) => e._id)).toEqual(["near", "mid", "far"]);

    const scores = ranked.map((e: any) => e.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("breaks equal scores on the earlier date", () => {
    const events = [
      makeEvent({ _id: "later", date: inDays(6) }),
      makeEvent({ _id: "sooner", date: inDays(5) }),
    ];
    expect(rankEvents(events, user, { now })[0]!._id).toBe("sooner");
  });

  it("orders identically regardless of input order", () => {
    const events = [
      makeEvent({ _id: "bbb", date: inDays(5) }),
      makeEvent({ _id: "aaa", date: inDays(5) }),
    ];
    const forward = rankEvents(events, user, { now }).map((e: any) => e._id);
    const reversed = rankEvents([...events].reverse(), user, { now }).map((e: any) => e._id);

    expect(forward).toEqual(reversed);
    expect(forward).toEqual(["aaa", "bbb"]);
  });

  it("returns an empty array for no candidates", () => {
    expect(rankEvents([], user, { now })).toEqual([]);
  });

  it("preserves the original event fields", () => {
    const ranked = rankEvents([makeEvent()], user, { now })[0]!;
    expect(ranked.title).toBe("Test Event");
    expect(ranked.sport).toBe("Football");
  });
});
