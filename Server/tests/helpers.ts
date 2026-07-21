import request, { type Response } from "supertest";
import { createApp } from "../app.js";

export const app = createApp();
export const api = () => request(app);

let counter = 0;

export interface TestUser {
  token: string;
  id: string;
  creds: { name: string; email: string; password: string };
  user: { _id: string; name: string; email: string; [key: string]: unknown };
}

export const makeUser = async (
  overrides: Record<string, unknown> = {}
): Promise<TestUser> => {
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

  return {
    token: res.body.token,
    id: res.body.user._id,
    creds: creds as TestUser["creds"],
    user: res.body.user,
  };
};

export const futureDate = (days = 1): string =>
  new Date(Date.now() + days * 86400000).toISOString();

export const BENGALURU = {
  address: "Chinnaswamy Stadium, Bengaluru",
  lat: 12.9788,
  lng: 77.5996,
};

export const makeEvent = (
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<Response> =>
  api()
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

export const locationNorthOf = (km: number, address = `${km}km north`) => ({
  address,
  lat: BENGALURU.lat + km / 111,
  lng: BENGALURU.lng,
});
