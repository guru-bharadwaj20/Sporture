import { describe, it, expect } from "vitest";
import type { UserDTO } from "@shared/api";
import {
  getStoredUser,
  setStoredUser,
  getToken,
  setToken,
  clearSession,
} from "./storage";

const user = {
  _id: "507f1f77bcf86cd799439011",
  name: "Radha Raman",
  email: "radha@example.com",
} as UserDTO;

describe("getStoredUser", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredUser()).toBeNull();
  });

  it("round-trips a stored user", () => {
    setStoredUser(user);
    expect(getStoredUser()).toEqual(user);
  });

  it("returns null for malformed JSON instead of throwing", () => {
    localStorage.setItem("user", "not-valid-json{{{");
    expect(() => getStoredUser()).not.toThrow();
    expect(getStoredUser()).toBeNull();
  });

  it("returns null when the stored value is the literal null", () => {
    localStorage.setItem("user", "null");
    expect(getStoredUser()).toBeNull();
  });

  it("rejects a stored value of the wrong shape", () => {
    localStorage.setItem("user", JSON.stringify({ nope: true }));
    expect(getStoredUser()).toBeNull();
  });

  it("rejects a stored primitive", () => {
    localStorage.setItem("user", JSON.stringify("just a string"));
    expect(getStoredUser()).toBeNull();
  });
});

describe("token helpers", () => {
  it("returns null when no token is set", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips a token", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
  });
});

describe("clearSession", () => {
  it("removes both the token and the user", () => {
    setToken("abc");
    setStoredUser(user);

    clearSession();

    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("is safe to call when nothing is stored", () => {
    expect(() => clearSession()).not.toThrow();
  });
});
