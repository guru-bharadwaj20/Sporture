import request from "supertest";
import { createApp } from "../app.js";

export const app = createApp();
export const api = () => request(app);

let counter = 0;

/** Registers a fresh user and returns their token, id and credentials. */
export const makeUser = async (overrides = {}) => {
  counter += 1;
  const creds = {
    name: `Test User ${counter}`,
    email: `user${counter}-${Date.now()}@test.com`,
    password: "SuperSecret123",
    ...overrides,
  };

  const res = await api().post("/api/auth/register").send(creds);
  if (res.status !== 201) {
    throw new Error(`makeUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token, id: res.body.user._id, creds, user: res.body.user };
};

/** A date `days` in the future, for events that must not be in the past. */
export const futureDate = (days = 1) =>
  new Date(Date.now() + days * 86400000).toISOString();

/**
 * Coordinates are always passed explicitly so tests never hit the live
 * geocoding service — that would make the suite slow, flaky and dependent on
 * network access in CI. The geocoding path itself is tested separately with
 * fetch stubbed out.
 */
export const BENGALURU = { address: "Chinnaswamy Stadium, Bengaluru", lat: 12.9788, lng: 77.5996 };

export const makeEvent = async (token, overrides = {}) => {
  const res = await api()
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Test Match",
      sport: "Cricket",
      date: futureDate(),
      location: BENGALURU,
      maxPlayers: 10,
      ...overrides,
    });
  return res;
};

/** Builds a location `km` kilometres north of Bengaluru. */
export const locationNorthOf = (km, address = `${km}km north`) => ({
  address,
  lat: BENGALURU.lat + km / 111, // ~111 km per degree of latitude
  lng: BENGALURU.lng,
});
