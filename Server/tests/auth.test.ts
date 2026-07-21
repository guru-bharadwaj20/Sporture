import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { api, makeUser } from "./helpers.js";
import User from "../models/userModel.js";

describe("POST /api/auth/register", () => {
  const valid = {
    name: "Alice",
    email: "alice@test.com",
    password: "SuperSecret123",
  };

  it("creates a user and returns a token", async () => {
    const res = await api().post("/api/auth/register").send(valid);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("alice@test.com");
  });

  it("never returns the password", async () => {
    const res = await api().post("/api/auth/register").send(valid);
    expect(res.body.user.password).toBeUndefined();
  });

  it("stores the password hashed, not in plaintext", async () => {
    await api().post("/api/auth/register").send(valid);

    const stored = (await User.findOne({ email: valid.email }).select("+password"))!;
    expect(stored.password).not.toBe(valid.password);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(valid.password, stored.password)).toBe(true);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...valid, password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.details.join(" ")).toMatch(/password/i);
  });

  it("rejects a malformed email", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await api().post("/api/auth/register").send(valid);
    const res = await api().post("/api/auth/register").send(valid);
    expect(res.status).toBe(409);
  });

  it("lowercases and trims the email", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...valid, email: "  MiXeD@Test.COM  " });
    expect(res.body.user.email).toBe("mixed@test.com");
  });

  it("ignores a client-supplied role", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...valid, role: "admin" });

    const stored = (await User.findById(res.body.user._id))!;
    expect(stored.role).toBe("user");
  });
});

describe("POST /api/auth/login", () => {
  it("succeeds with correct credentials", async () => {
    const { creds } = await makeUser();
    const res = await api()
      .post("/api/auth/login")
      .send({ email: creds.email, password: creds.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a wrong password", async () => {
    const { creds } = await makeUser();
    const res = await api()
      .post("/api/auth/login")
      .send({ email: creds.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("does not let an attacker distinguish a real account from a fake one", async () => {
    const { creds } = await makeUser();

    const wrongPassword = await api()
      .post("/api/auth/login")
      .send({ email: creds.email, password: "wrong-password" });

    const noSuchUser = await api()
      .post("/api/auth/login")
      .send({ email: "ghost@nowhere.com", password: "wrong-password" });

    expect(noSuchUser.status).toBe(wrongPassword.status);
    expect(noSuchUser.body.message).toBe(wrongPassword.body.message);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the authenticated user", async () => {
    const { token, id } = await makeUser();
    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(id);
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a missing token", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
  });

  it("rejects a malformed token", async () => {
    const res = await api().get("/api/auth/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with a different secret", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const forged = jwt.sign({ id: "507f1f77bcf86cd799439011" }, "wrong-secret");
    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a valid token whose user no longer exists", async () => {
    const { token, id } = await makeUser();
    await User.findByIdAndDelete(id);

    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
