import { describe, it, expect } from "vitest";
import { api, makeUser } from "./helpers.js";

const post = (token: string, body: Record<string, unknown>) =>
  api().post("/api/feedback").set("Authorization", `Bearer ${token}`).send(body);

describe("POST /api/feedback", () => {
  it("requires authentication", async () => {
    const res = await api().post("/api/feedback").send({ rating: 5, comment: "Nice" });
    expect(res.status).toBe(401);
  });

  it("creates feedback for the authenticated user", async () => {
    const { token, user } = await makeUser();
    const res = await post(token, { rating: 5, comment: "Great app" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(user.name);
  });

  it("ignores a spoofed author in the request body", async () => {
    const { token, user, creds } = await makeUser();

    const res = await post(token, {
      rating: 5,
      comment: "Great app",
      name: "Someone Else",
      email: "spoof@evil.com",
    });

    expect(res.body.name).toBe(user.name);
    expect(res.body.email).toBe(creds.email.toLowerCase());
  });

  it.each([0, 6, -1, 99])("rejects an out-of-range rating: %i", async (rating) => {
    const { token } = await makeUser();
    expect((await post(token, { rating, comment: "x" })).status).toBe(400);
  });

  it("rejects an empty comment", async () => {
    const { token } = await makeUser();
    expect((await post(token, { rating: 5, comment: "   " })).status).toBe(400);
  });
});

describe("GET /api/feedback", () => {
  it("is public", async () => {
    expect((await api().get("/api/feedback")).status).toBe(200);
  });

  it("withholds author email addresses", async () => {
    const { token } = await makeUser();
    await post(token, { rating: 5, comment: "Great app" });

    const res = await api().get("/api/feedback");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBeUndefined();
    expect(res.body[0].comment).toBe("Great app");
  });

  it("returns newest first", async () => {
    const { token } = await makeUser();
    await post(token, { rating: 5, comment: "First" });
    await post(token, { rating: 4, comment: "Second" });

    const res = await api().get("/api/feedback");
    expect(res.body[0].comment).toBe("Second");
  });
});

describe("DELETE /api/feedback/:id", () => {
  it("requires authentication", async () => {
    const { token } = await makeUser();
    const created = await post(token, { rating: 5, comment: "x" });
    expect((await api().delete(`/api/feedback/${created.body._id}`)).status).toBe(401);
  });

  it("lets the author delete their own feedback", async () => {
    const { token } = await makeUser();
    const created = await post(token, { rating: 5, comment: "x" });

    const res = await api()
      .delete(`/api/feedback/${created.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect((await api().get("/api/feedback")).body).toHaveLength(0);
  });

  it("forbids deleting someone else's feedback", async () => {
    const author = await makeUser();
    const attacker = await makeUser();
    const created = await post(author.token, { rating: 5, comment: "x" });

    const res = await api()
      .delete(`/api/feedback/${created.body._id}`)
      .set("Authorization", `Bearer ${attacker.token}`);

    expect(res.status).toBe(403);
    expect((await api().get("/api/feedback")).body).toHaveLength(1);
  });

  it("404s for feedback that does not exist", async () => {
    const { token } = await makeUser();
    const res = await api()
      .delete("/api/feedback/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("error handling", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await api().get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("responds to /health", async () => {
    const res = await api().get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
