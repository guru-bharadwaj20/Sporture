import { describe, it, expect } from "vitest";
import { api, makeUser } from "./helpers.js";
import User from "../models/userModel.js";

describe("GET /api/users/:id", () => {
  it("requires authentication", async () => {
    const { id } = await makeUser();
    expect((await api().get(`/api/users/${id}`)).status).toBe(401);
  });

  it("never exposes the password", async () => {
    const { token } = await makeUser();
    const target = await makeUser();

    const res = await api()
      .get(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
  });

  it("does not leak another user's email address", async () => {
    const { token } = await makeUser();
    const target = await makeUser();

    const res = await api()
      .get(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.email).toBeUndefined();
    expect(res.body.name).toBeTruthy();
  });

  it("rejects a malformed id", async () => {
    const { token } = await makeUser();
    const res = await api().get("/api/users/not-an-id").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("404s for an id that does not exist", async () => {
    const { token } = await makeUser();
    const res = await api()
      .get("/api/users/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/users/:id", () => {
  it("requires authentication", async () => {
    const { id } = await makeUser();
    const res = await api().put(`/api/users/${id}`).send({ name: "Hacked" });
    expect(res.status).toBe(401);
  });

  it("updates the caller's own allowed fields", async () => {
    const { token, id } = await makeUser();
    const res = await api()
      .put(`/api/users/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name", city: "Bengaluru", bio: "Updated bio" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.city).toBe("Bengaluru");
  });

  it("forbids editing another user's profile", async () => {
    const attacker = await makeUser();
    const victim = await makeUser();

    const res = await api()
      .put(`/api/users/${victim.id}`)
      .set("Authorization", `Bearer ${attacker.token}`)
      .send({ name: "Owned" });

    expect(res.status).toBe(403);

    const stored = (await User.findById(victim.id))!;
    expect(stored.name).not.toBe("Owned");
  });

  describe("mass assignment", () => {
    const forbidden = [
      ["rating", 5, 0],
      ["gamesPlayed", 9999, 0],
      ["eventsHosted", 9999, 0],
      ["role", "admin", "user"],
    ];

    it.each(forbidden)("ignores client-supplied %s", async (field, attempt, expected) => {
      const { token, id } = await makeUser();

      const res = await api()
        .put(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Legit Update", [field]: attempt });

      expect(res.status).toBe(200);
      expect(res.body[field]).toBe(expected);

      const stored = (await User.findById(id))!;
      expect((stored as unknown as Record<string, unknown>)[field]).toBe(expected);
    });

    it("ignores a client-supplied email change", async () => {
      const { token, id, creds } = await makeUser();

      await api()
        .put(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Legit", email: "attacker@evil.com" });

      const stored = (await User.findById(id))!;
      expect(stored.email).toBe(creds.email.toLowerCase());
    });

    it("ignores a client-supplied password change", async () => {
      const { token, id } = await makeUser();
      const before = (await User.findById(id).select("+password"))!.password;

      await api()
        .put(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Legit", password: "attacker-chosen-password" });

      const after = (await User.findById(id).select("+password"))!.password;
      expect(after).toBe(before);
    });

    it("still applies the legitimate fields alongside rejected ones", async () => {
      const { token, id } = await makeUser();

      const res = await api()
        .put(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Should Save", rating: 5, role: "admin" });

      expect(res.body.name).toBe("Should Save");
    });
  });

  it("rejects an empty update", async () => {
    const { token, id } = await makeUser();
    const res = await api()
      .put(`/api/users/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects an invalid skill level", async () => {
    const { token, id } = await makeUser();
    const res = await api()
      .put(`/api/users/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ skillLevel: "Godlike" });
    expect(res.status).toBe(400);
  });
});
