import { z } from "zod";

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

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
// Deliberately omits password, email, rating, gamesPlayed and eventsHosted:
// those are either set elsewhere or derived, and must not be client-writable.
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
export const createEventSchema = z.object({
  title: z.string().trim().min(3, "must be at least 3 characters").max(100),
  sport: z.string().trim().min(2).max(40),
  date: z.coerce
    .date({ error: "must be a valid date" })
    .refine((d) => d.getTime() > Date.now(), { message: "must be in the future" }),
  location: z.string().trim().min(3).max(200),
  maxPlayers: z.coerce
    .number()
    .int("must be a whole number")
    .min(2, "must allow at least 2 players")
    .max(100),
});

export const eventQuerySchema = z.object({
  sport: z.string().trim().max(40).optional(),
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
