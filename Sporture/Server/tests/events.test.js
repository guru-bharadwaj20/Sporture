import { describe, it, expect } from "vitest";
import { api, makeUser, makeEvent, futureDate } from "./helpers.js";
import Event from "../models/Event.js";
import User from "../models/userModel.js";

describe("POST /api/events", () => {
  it("requires authentication", async () => {
    const res = await api().post("/api/events").send({
      title: "Match", sport: "Cricket", date: futureDate(), location: "Ground", maxPlayers: 10,
    });
    expect(res.status).toBe(401);
  });

  it("creates an event with the caller as host and first player", async () => {
    const { token, id } = await makeUser();
    const res = await makeEvent(token);

    expect(res.status).toBe(201);
    expect(res.body.currentPlayers).toContain(id);
  });

  it("increments the host's counters", async () => {
    const { token, id } = await makeUser();
    await makeEvent(token);

    const user = await User.findById(id);
    expect(user.eventsHosted).toBe(1);
    expect(user.gamesPlayed).toBe(1);
  });

  it("rejects an event scheduled in the past", async () => {
    const { token } = await makeUser();
    const res = await makeEvent(token, { date: "2020-01-01" });
    expect(res.status).toBe(400);
  });

  it("rejects a maxPlayers below 2", async () => {
    const { token } = await makeUser();
    expect((await makeEvent(token, { maxPlayers: 1 })).status).toBe(400);
  });

  it("rejects missing fields", async () => {
    const { token } = await makeUser();
    const res = await api()
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Only a title" });
    expect(res.status).toBe(400);
  });

  it("coerces a numeric string maxPlayers", async () => {
    const { token } = await makeUser();
    const res = await makeEvent(token, { maxPlayers: "12" });
    expect(res.status).toBe(201);
    expect(res.body.maxPlayers).toBe(12);
  });
});

describe("GET /api/events", () => {
  it("is public", async () => {
    expect((await api().get("/api/events")).status).toBe(200);
  });

  it("filters by sport, case-insensitively", async () => {
    const { token } = await makeUser();
    await makeEvent(token, { sport: "Cricket" });
    await makeEvent(token, { sport: "Tennis" });

    const res = await api().get("/api/events?sport=cricket");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sport).toBe("Cricket");
  });

  it("treats regex metacharacters literally", async () => {
    const { token } = await makeUser();
    await makeEvent(token, { sport: "Cricket" });
    await makeEvent(token, { sport: "Tennis" });

    // Unescaped, ".*" would match every sport in the collection.
    const res = await api().get("/api/events?sport=.*");
    expect(res.body).toHaveLength(0);
  });
});

describe("GET /api/events/:id", () => {
  it("does not leak participant email addresses", async () => {
    const { token } = await makeUser();
    const ev = await makeEvent(token);

    const res = await api().get(`/api/events/${ev.body._id}`);
    expect(res.status).toBe(200);
    for (const p of res.body.currentPlayers) expect(p.email).toBeUndefined();
    expect(res.body.createdBy.email).toBeUndefined();
  });

  it("400s on a malformed id", async () => {
    expect((await api().get("/api/events/not-an-id")).status).toBe(400);
  });

  it("404s on an unknown id", async () => {
    expect((await api().get("/api/events/507f1f77bcf86cd799439011")).status).toBe(404);
  });
});

describe("POST /api/events/:id/join", () => {
  it("requires authentication", async () => {
    const { token } = await makeUser();
    const ev = await makeEvent(token);
    expect((await api().post(`/api/events/${ev.body._id}/join`)).status).toBe(401);
  });

  it("lets another user join", async () => {
    const host = await makeUser();
    const joiner = await makeUser();
    const ev = await makeEvent(host.token);

    const res = await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${joiner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.event.currentPlayers).toHaveLength(2);
  });

  it("increments the joiner's gamesPlayed", async () => {
    const host = await makeUser();
    const joiner = await makeUser();
    const ev = await makeEvent(host.token);

    await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${joiner.token}`);

    expect((await User.findById(joiner.id)).gamesPlayed).toBe(1);
  });

  it("stops the host joining their own event", async () => {
    const host = await makeUser();
    const ev = await makeEvent(host.token);

    const res = await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${host.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/host/i);
  });

  it("stops a user joining twice", async () => {
    const host = await makeUser();
    const joiner = await makeUser();
    const ev = await makeEvent(host.token);
    const url = `/api/events/${ev.body._id}/join`;

    await api().post(url).set("Authorization", `Bearer ${joiner.token}`);
    const second = await api().post(url).set("Authorization", `Bearer ${joiner.token}`);

    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already/i);
  });

  it("rejects joining a full event", async () => {
    const host = await makeUser();
    const a = await makeUser();
    const b = await makeUser();
    const ev = await makeEvent(host.token, { maxPlayers: 2 }); // host occupies one slot

    const first = await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${a.token}`);
    expect(first.status).toBe(200);

    const second = await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${b.token}`);
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/full/i);
  });

  it("never exceeds maxPlayers under concurrent joins", async () => {
    const host = await makeUser();
    const ev = await makeEvent(host.token, { maxPlayers: 3 }); // 2 slots left
    const joiners = await Promise.all([1, 2, 3, 4, 5, 6].map(() => makeUser()));

    // A read-then-write implementation lets several of these pass the capacity
    // check simultaneously and overfill the event.
    const results = await Promise.all(
      joiners.map((j) =>
        api()
          .post(`/api/events/${ev.body._id}/join`)
          .set("Authorization", `Bearer ${j.token}`)
      )
    );

    const succeeded = results.filter((r) => r.status === 200).length;
    expect(succeeded).toBe(2);

    const stored = await Event.findById(ev.body._id);
    expect(stored.currentPlayers.length).toBe(stored.maxPlayers);
  });

  it("rejects joining an event that has already started", async () => {
    const host = await makeUser();
    const joiner = await makeUser();
    const ev = await makeEvent(host.token);

    // Bypass validation to simulate time passing.
    await Event.findByIdAndUpdate(ev.body._id, { date: new Date(Date.now() - 3600000) });

    const res = await api()
      .post(`/api/events/${ev.body._id}/join`)
      .set("Authorization", `Bearer ${joiner.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/started/i);
  });
});

describe("GET /api/events/joined", () => {
  it("requires authentication", async () => {
    expect((await api().get("/api/events/joined")).status).toBe(401);
  });

  it("returns hosted and joined events but not unrelated ones", async () => {
    const me = await makeUser();
    const other = await makeUser();

    const mine = await makeEvent(me.token, { title: "Mine" });
    const theirs = await makeEvent(other.token, { title: "Theirs" });
    const joinable = await makeEvent(other.token, { title: "Joined" });

    await api()
      .post(`/api/events/${joinable.body._id}/join`)
      .set("Authorization", `Bearer ${me.token}`);

    const res = await api().get("/api/events/joined").set("Authorization", `Bearer ${me.token}`);
    const titles = res.body.map((e) => e.title).sort();

    expect(titles).toEqual(["Joined", "Mine"]);
    expect(titles).not.toContain("Theirs");
    expect(theirs.status).toBe(201);
  });
});
