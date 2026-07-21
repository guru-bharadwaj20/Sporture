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

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    favSports: z.array(z.string().trim().min(1)).max(20).optional(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    city: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "at least one field must be provided",
  });

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

const MAX_RADIUS_METRES = 200_000;

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
    upcoming: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v !== "false"),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: "lat and lng must be provided together",
    path: ["lat"],
  })
  .refine((q) => q.radius === undefined || q.lat !== undefined, {
    message: "radius requires lat and lng",
    path: ["radius"],
  });

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

export const createFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, "must be at least 1").max(5, "must be at most 5"),
  comment: z.string().trim().min(1, "is required").max(1000),
});

export const idParamSchema = z.object({ id: objectId });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
export type RecommendQuery = z.infer<typeof recommendQuerySchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
