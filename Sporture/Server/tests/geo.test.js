import { describe, it, expect, vi, afterEach } from "vitest";
import { api, makeUser, makeEvent, BENGALURU, locationNorthOf } from "./helpers.js";
import Event from "../models/Event.js";
import { _clearCache } from "../services/geocoder.js";

const near = (params) => api().get("/api/events").query(params);

describe("event location storage", () => {
  it("stores explicit coordinates as a GeoJSON Point in [lng, lat] order", async () => {
    const { token } = await makeUser();
    const res = await makeEvent(token, { location: BENGALURU });

    expect(res.status).toBe(201);
    expect(res.body.location.address).toBe(BENGALURU.address);
    expect(res.body.location.geo.type).toBe("Point");
    // MongoDB stores longitude first — the reverse of how they're usually said.
    expect(res.body.location.geo.coordinates).toEqual([BENGALURU.lng, BENGALURU.lat]);
  });

  it("rejects an out-of-range latitude", async () => {
    const { token } = await makeUser();
    const res = await makeEvent(token, {
      location: { address: "Nowhere", lat: 200, lng: 77 },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range longitude", async () => {
    const { token } = await makeUser();
    const res = await makeEvent(token, {
      location: { address: "Nowhere", lat: 12, lng: 999 },
    });
    expect(res.status).toBe(400);
  });

  it("creates the 2dsphere index", async () => {
    const indexes = await Event.collection.indexes();
    const geo = indexes.find((i) => i.key?.["location.geo"] === "2dsphere");
    expect(geo).toBeDefined();
  });
});

describe("GET /api/events — proximity search", () => {
  const seed = async (token) => {
    await makeEvent(token, { title: "At centre", location: locationNorthOf(0, "centre") });
    await makeEvent(token, { title: "5km away", location: locationNorthOf(5) });
    await makeEvent(token, { title: "20km away", location: locationNorthOf(20) });
    await makeEvent(token, { title: "80km away", location: locationNorthOf(80) });
  };

  it("returns only events inside the radius", async () => {
    const { token } = await makeUser();
    await seed(token);

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 10000 });

    expect(res.status).toBe(200);
    const titles = res.body.map((e) => e.title);
    expect(titles).toContain("At centre");
    expect(titles).toContain("5km away");
    expect(titles).not.toContain("20km away");
    expect(titles).not.toContain("80km away");
  });

  it("sorts results nearest first", async () => {
    const { token } = await makeUser();
    await seed(token);

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 100000 });
    const distances = res.body.map((e) => e.distanceMetres);

    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(res.body[0].title).toBe("At centre");
  });

  it("reports distance in metres, accurate to within a few percent", async () => {
    const { token } = await makeUser();
    await makeEvent(token, { title: "5km away", location: locationNorthOf(5) });

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 100000 });
    const found = res.body.find((e) => e.title === "5km away");

    // Spherical geometry over ~5km; allow for the flat-earth approximation
    // used to build the fixture.
    expect(found.distanceMetres).toBeGreaterThan(4800);
    expect(found.distanceMetres).toBeLessThan(5200);
  });

  it("applies a default radius when none is given", async () => {
    const { token } = await makeUser();
    await seed(token);

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng });
    const titles = res.body.map((e) => e.title);

    expect(titles).toContain("20km away"); // inside the 25km default
    expect(titles).not.toContain("80km away");
  });

  it("combines proximity with a sport filter", async () => {
    const { token } = await makeUser();
    await makeEvent(token, { title: "Near cricket", sport: "Cricket", location: locationNorthOf(2) });
    await makeEvent(token, { title: "Near tennis", sport: "Tennis", location: locationNorthOf(3) });

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 10000, sport: "cricket" });

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Near cricket");
  });

  it("still populates host and player names", async () => {
    const { token } = await makeUser();
    await makeEvent(token, { location: locationNorthOf(1) });

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 10000 });

    expect(res.body[0].createdBy.name).toBeTruthy();
    expect(res.body[0].createdBy.email).toBeUndefined();
    expect(res.body[0].currentPlayers[0].name).toBeTruthy();
  });

  it("excludes events that have already started", async () => {
    const { token } = await makeUser();
    const ev = await makeEvent(token, { title: "Past", location: locationNorthOf(1) });
    await Event.findByIdAndUpdate(ev.body._id, { date: new Date(Date.now() - 3600000) });

    const res = await near({ lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 10000 });
    expect(res.body.map((e) => e.title)).not.toContain("Past");
  });

  it("includes past events when upcoming=false", async () => {
    const { token } = await makeUser();
    const ev = await makeEvent(token, { title: "Past", location: locationNorthOf(1) });
    await Event.findByIdAndUpdate(ev.body._id, { date: new Date(Date.now() - 3600000) });

    const res = await near({
      lat: BENGALURU.lat, lng: BENGALURU.lng, radius: 10000, upcoming: "false",
    });
    expect(res.body.map((e) => e.title)).toContain("Past");
  });

  describe("query validation", () => {
    it("rejects lat without lng", async () => {
      const res = await near({ lat: 12.97 });
      expect(res.status).toBe(400);
      expect(res.body.details.join(" ")).toMatch(/together/i);
    });

    it("rejects lng without lat", async () => {
      expect((await near({ lng: 77.59 })).status).toBe(400);
    });

    it("rejects radius without a centre", async () => {
      const res = await near({ radius: 5000 });
      expect(res.status).toBe(400);
      expect(res.body.details.join(" ")).toMatch(/lat/i);
    });

    it("rejects an out-of-range latitude", async () => {
      expect((await near({ lat: 91, lng: 77 })).status).toBe(400);
    });

    it("rejects a negative radius", async () => {
      expect((await near({ lat: 12.97, lng: 77.59, radius: -5 })).status).toBe(400);
    });

    it("rejects an absurdly large radius", async () => {
      expect((await near({ lat: 12.97, lng: 77.59, radius: 999999999 })).status).toBe(400);
    });

    it("falls back to a chronological listing without coordinates", async () => {
      const { token } = await makeUser();
      await makeEvent(token);

      const res = await near({});
      expect(res.status).toBe(200);
      expect(res.body[0].distanceMetres).toBeUndefined();
    });
  });
});

describe("geocoding on event creation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _clearCache();
  });

  const stubGeocoder = (payload, ok = true) =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok,
      json: async () => payload,
    }));

  it("geocodes a bare address string", async () => {
    stubGeocoder([{ lat: "12.9788", lon: "77.5996", display_name: "Chinnaswamy Stadium" }]);

    const { token } = await makeUser();
    const res = await makeEvent(token, { location: "Chinnaswamy Stadium, Bengaluru" });

    expect(res.status).toBe(201);
    expect(res.body.location.geo.coordinates).toEqual([77.5996, 12.9788]);
    expect(res.body.location.address).toBe("Chinnaswamy Stadium, Bengaluru");
  });

  it("returns 422 when the address cannot be resolved", async () => {
    stubGeocoder([]);

    const { token } = await makeUser();
    const res = await makeEvent(token, { location: "asdfghjkl qwertyuiop" });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/could not find/i);
  });

  it("returns 503 when the geocoding service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { token } = await makeUser();
    const res = await makeEvent(token, { location: "Somewhere Real" });

    expect(res.status).toBe(503);
  });

  it("does not call the geocoder when coordinates are supplied", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);

    const { token } = await makeUser();
    const res = await makeEvent(token, { location: BENGALURU });

    expect(res.status).toBe(201);
    expect(spy).not.toHaveBeenCalled();
  });

  it("caches repeated lookups of the same address", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "12.9", lon: "77.5", display_name: "Cached Venue" }],
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { token } = await makeUser();
    await makeEvent(token, { location: "Cached Venue, Bengaluru" });
    await makeEvent(token, { location: "cached venue, bengaluru" }); // different case

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
