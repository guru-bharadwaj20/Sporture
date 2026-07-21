import { z } from "zod";
import { SKILL_LEVELS } from "../models/userModel.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

const latitude = z.coerce
  .number()
  .min(-90, "must be between -90 and 90")
  .max(90, "must be between -90 and 90");

const longitude = z.coerce
  .number()
  .min(-180, "must be between -180 and 180")
  .max(180, "must be between -180 and 180");

/* ----------------------------- AUTH ----------------------------- */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(8, "must be at least 8 characters").max(128),
  favSports: z.array(z.string().trim().min(1)).max(20).optional(),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(1, "is required"),
});

/* ----------------------------- USER ----------------------------- */
// Deliberately omits password, email, rating, gamesPlayed, eventsHosted and
// role: those are either derived or privileged, and must not be client-writable.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    favSports: z.array(z.string().trim().min(1)).max(20).optional(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    city: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  // Not .strict(): unknown keys are stripped rather than rejected, so a client
  // that echoes back a whole user object still works — the extra fields simply
  // never reach the database.
  .refine((d) => Object.keys(d).length > 0, {
    message: "at least one field must be provided",
  });

/* ---------------------------- EVENTS ---------------------------- */
/**
 * Location accepts either a bare address string (server geocodes it) or an
 * address plus explicit coordinates (from a map picker or browser geolocation,
 * which is both faster and more accurate).
 */
export const locationInputSchema = z.union([
  z.string().trim().min(3, "must be at least 3 characters").max(200),
  z.object({
    address: z.string().trim().min(3).max(200),
    lat: latitude.optional(),
    lng: longitude.optional(),
  }),
]);

export const createEventSchema = z.object({
  title: z.string().trim().min(3, "must be at least 3 characters").max(100),
  sport: z.string().trim().min(2).max(40),
  date: z.coerce
    .date({ error: "must be a valid date" })
    .refine((d) => d.getTime() > Date.now(), { message: "must be in the future" }),
  location: locationInputSchema,
  maxPlayers: z.coerce
    .number()
    .int("must be a whole number")
    .min(2, "must allow at least 2 players")
    .max(100),
});

const MAX_RADIUS_METRES = 200_000; // 200km — beyond this "nearby" is meaningless

export const eventQuerySchema = z
  .object({
    sport: z.string().trim().max(40).optional(),
    lat: latitude.optional(),
    lng: longitude.optional(),
    radius: z.coerce
      .number()
      .int()
      .positive("must be greater than 0")
      .max(MAX_RADIUS_METRES, `must be at most ${MAX_RADIUS_METRES} metres`)
      .optional(),
    // Hide events that have already started. Defaults on so the discovery
    // page never shows something you cannot join.
    upcoming: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v !== "false"),
  })
  // A radius search needs a centre; lat without lng (or vice versa) is a
  // client bug worth surfacing rather than silently ignoring.
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: "lat and lng must be provided together",
    path: ["lat"],
  })
  .refine((q) => q.radius === undefined || q.lat !== undefined, {
    message: "radius requires lat and lng",
    path: ["radius"],
  });

/** Recommendations take an optional centre so distance can be scored. */
export const recommendQuerySchema = z
  .object({
    lat: latitude.optional(),
    lng: longitude.optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: "lat and lng must be provided together",
    path: ["lat"],
  });

/* --------------------------- FEEDBACK --------------------------- */
// `name` and `email` are intentionally absent: they are taken from the
// authenticated user so feedback cannot be submitted under someone else's name.
export const createFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, "must be at least 1").max(5, "must be at most 5"),
  comment: z.string().trim().min(1, "is required").max(1000),
});

/* ---------------------------- PARAMS ---------------------------- */
export const idParamSchema = z.object({ id: objectId });

/* ----------------------- INFERRED TYPES ----------------------- */
// Derived from the schemas rather than declared separately, so the validated
// shape and the static type cannot drift apart.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
export type RecommendQuery = z.infer<typeof recommendQuerySchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
