import { describe, it, expect } from "vitest";
import { api, makeUser, makeEvent, BENGALURU, locationNorthOf, futureDate } from "./helpers.js";
import Event from "../models/Event.js";

const recommend = (token: string, params: Record<string, unknown> = {}) =>
  api().get("/api/events/recommended").query(params).set("Authorization", `Bearer ${token}`);

describe("GET /api/events/recommended", () => {
  it("requires authentication", async () => {
    expect((await api().get("/api/events/recommended")).status).toBe(401);
  });

  it("is not shadowed by the /:id route", async () => {
    // "recommended" is a valid path segment where an id is expected, so a
    // wrongly-ordered router would try to cast it to an ObjectId and 400.
    const { token } = await makeUser();
    const res = await recommend(token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it("returns an empty list when there is nothing to recommend", async () => {
    const { token } = await makeUser();
    const res = await recommend(token);

    expect(res.body.count).toBe(0);
    expect(res.body.events).toEqual([]);
  });

  it("attaches a score and reasons to each event", async () => {
    const host = await makeUser();
    const viewer = await makeUser({ favSports: ["Cricket"] });
    await makeEvent(host.token, { sport: "Cricket" });

    const res = await recommend(viewer.token);

    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].score).toBeGreaterThan(0);
    expect(Array.isArray(res.body.events[0].reasons)).toBe(true);
    expect(res.body.events[0].breakdown).toBeDefined();
  });

  describe("exclusions", () => {
    it("excludes events the user hosts", async () => {
      const me = await makeUser();
      await makeEvent(me.token, { title: "Mine" });

      const res = await recommend(me.token);
      expect(res.body.events.map((e: any) => e.title)).not.toContain("Mine");
    });

    it("excludes events the user has already joined", async () => {
      const host = await makeUser();
      const viewer = await makeUser();
      const ev = await makeEvent(host.token, { title: "Joined" });

      await api()
        .post(`/api/events/${ev.body._id}/join`)
        .set("Authorization", `Bearer ${viewer.token}`);

      const res = await recommend(viewer.token);
      expect(res.body.events.map((e: any) => e.title)).not.toContain("Joined");
    });

    it("excludes events that have already started", async () => {
      const host = await makeUser();
      const viewer = await makeUser();
      const ev = await makeEvent(host.token, { title: "Past" });
      await Event.findByIdAndUpdate(ev.body._id, { date: new Date(Date.now() - 3600000) });

      const res = await recommend(viewer.token);
      expect(res.body.events.map((e: any) => e.title)).not.toContain("Past");
    });

    it("excludes full events", async () => {
      const host = await makeUser();
      const filler = await makeUser();
      const viewer = await makeUser();

      // maxPlayers 2, host occupies one slot, filler takes the other.
      const ev = await makeEvent(host.token, { title: "Full", maxPlayers: 2 });
      await api()
        .post(`/api/events/${ev.body._id}/join`)
        .set("Authorization", `Bearer ${filler.token}`);

      const res = await recommend(viewer.token);
      expect(res.body.events.map((e: any) => e.title)).not.toContain("Full");
    });
  });

  describe("ranking", () => {
    it("ranks a favourite sport above a non-favourite", async () => {
      const host = await makeUser();
      const viewer = await makeUser({ favSports: ["Badminton"] });

      await makeEvent(host.token, { title: "Cricket game", sport: "Cricket" });
      await makeEvent(host.token, { title: "Badminton game", sport: "Badminton" });

      const res = await recommend(viewer.token);
      expect(res.body.events[0].title).toBe("Badminton game");
    });

    it("ranks a closer event above a distant one when coordinates are given", async () => {
      const host = await makeUser();
      const viewer = await makeUser({ favSports: ["Cricket"] });

      await makeEvent(host.token, { title: "Far", location: locationNorthOf(30) });
      await makeEvent(host.token, { title: "Near", location: locationNorthOf(1) });

      const res = await recommend(viewer.token, { lat: BENGALURU.lat, lng: BENGALURU.lng });
      expect(res.body.events[0].title).toBe("Near");
    });

    it("includes distance only when coordinates are supplied", async () => {
      const host = await makeUser();
      const viewer = await makeUser();
      await makeEvent(host.token);

      const without = await recommend(viewer.token);
      expect(without.body.events[0].distanceMetres).toBeUndefined();

      const withCoords = await recommend(viewer.token, {
        lat: BENGALURU.lat,
        lng: BENGALURU.lng,
      });
      expect(withCoords.body.events[0].distanceMetres).toBeDefined();
    });

    it("still ranks sensibly with no location and no stated preferences", async () => {
      const host = await makeUser();
      const viewer = await makeUser({ favSports: [] });

      await makeEvent(host.token, { title: "Soon", date: futureDate(1) });
      await makeEvent(host.token, { title: "Distant future", date: futureDate(60) });

      const res = await recommend(viewer.token);
      // With every other signal neutral, urgency decides.
      expect(res.body.events[0].title).toBe("Soon");
    });

    it("returns scores in descending order", async () => {
      const host = await makeUser();
      const viewer = await makeUser({ favSports: ["Cricket"] });

      await makeEvent(host.token, { sport: "Cricket", location: locationNorthOf(1) });
      await makeEvent(host.token, { sport: "Tennis", location: locationNorthOf(12) });
      await makeEvent(host.token, { sport: "Hockey", location: locationNorthOf(25) });

      const res = await recommend(viewer.token, { lat: BENGALURU.lat, lng: BENGALURU.lng });
      const scores = res.body.events.map((e: any) => e.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });
  });

  describe("query handling", () => {
    it("honours the limit parameter", async () => {
      const host = await makeUser();
      const viewer = await makeUser();
      // Titles must clear the 3-character minimum in createEventSchema.
      for (let i = 0; i < 5; i++) {
        const created = await makeEvent(host.token, { title: `Event number ${i}` });
        expect(created.status).toBe(201);
      }

      const res = await recommend(viewer.token, { limit: 2 });
      expect(res.body.events).toHaveLength(2);
      expect(res.body.count).toBe(5); // total considered, before slicing
    });

    it("rejects lat without lng", async () => {
      const { token } = await makeUser();
      expect((await recommend(token, { lat: 12.9 })).status).toBe(400);
    });

    it("rejects an out-of-range limit", async () => {
      const { token } = await makeUser();
      expect((await recommend(token, { limit: 500 })).status).toBe(400);
      expect((await recommend(token, { limit: 0 })).status).toBe(400);
    });

    it("rejects an invalid latitude", async () => {
      const { token } = await makeUser();
      expect((await recommend(token, { lat: 91, lng: 77 })).status).toBe(400);
    });
  });

  describe("social signal", () => {
    it("boosts events containing people the user has played with", async () => {
      const host = await makeUser();
      const teammate = await makeUser();
      const stranger = await makeUser();
      const viewer = await makeUser({ favSports: [] });

      // Shared history: viewer and teammate both join the same past event.
      const shared = await makeEvent(host.token, { title: "Shared history" });
      for (const t of [viewer.token, teammate.token]) {
        await api().post(`/api/events/${shared.body._id}/join`).set("Authorization", `Bearer ${t}`);
      }

      // Two comparable candidates, distinguished only by who is in them.
      const withFriend = await makeEvent(host.token, { title: "With friend", date: futureDate(5) });
      const withStranger = await makeEvent(host.token, { title: "With stranger", date: futureDate(5) });

      await api()
        .post(`/api/events/${withFriend.body._id}/join`)
        .set("Authorization", `Bearer ${teammate.token}`);
      await api()
        .post(`/api/events/${withStranger.body._id}/join`)
        .set("Authorization", `Bearer ${stranger.token}`);

      const res = await recommend(viewer.token);
      const titles = res.body.events.map((e: any) => e.title);

      expect(titles.indexOf("With friend")).toBeLessThan(titles.indexOf("With stranger"));

      const friendEvent = res.body.events.find((e: any) => e.title === "With friend");
      expect(friendEvent.reasons.join(" ")).toMatch(/played with/i);
    });

    it("does not count the user themselves as a familiar face", async () => {
      const hostA = await makeUser();
      const hostB = await makeUser();
      const viewer = await makeUser({ favSports: [] });

      // Viewer joins one of hostA's events, so their own id lands in the set
      // of people present at events they've attended.
      const past = await makeEvent(hostA.token, { title: "Already attended" });
      await api()
        .post(`/api/events/${past.body._id}/join`)
        .set("Authorization", `Bearer ${viewer.token}`);

      // A candidate hosted by someone unrelated: the only id the viewer could
      // possibly "recognise" is their own, which must not count.
      const fresh = await makeEvent(hostB.token, {
        title: "Unrelated candidate",
        date: futureDate(5),
      });
      expect(fresh.status).toBe(201);

      const res = await recommend(viewer.token);
      const candidate = res.body.events.find((e: any) => e.title === "Unrelated candidate");

      expect(candidate.breakdown.social).toBe(0);
    });

    it("does count a genuine past teammate", async () => {
      // Counterpart to the test above: proves the zero there is real
      // self-exclusion rather than the signal being broken outright.
      const host = await makeUser();
      const viewer = await makeUser({ favSports: [] });

      const past = await makeEvent(host.token, { title: "Already attended" });
      await api()
        .post(`/api/events/${past.body._id}/join`)
        .set("Authorization", `Bearer ${viewer.token}`);

      const fresh = await makeEvent(host.token, {
        title: "Hosted by the same person",
        date: futureDate(5),
      });
      expect(fresh.status).toBe(201);

      const res = await recommend(viewer.token);
      const candidate = res.body.events.find(
        (e: any) => e.title === "Hosted by the same person"
      );

      expect(candidate.breakdown.social).toBeGreaterThan(0);
    });
  });
});
