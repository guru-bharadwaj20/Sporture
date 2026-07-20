/**
 * The API contract, shared by the server and the client.
 *
 * These describe the JSON *on the wire*, which is not the same as the server's
 * Mongoose models: dates arrive as ISO strings, ObjectIds as strings, and
 * populated references as nested objects. Keeping that distinction explicit is
 * the point — a client typed against the Mongoose model would believe
 * `event.date` is a `Date` and silently break on `.getTime()`.
 *
 * Type-only: nothing here emits runtime code, so importing it across package
 * boundaries costs nothing at build time.
 */

export const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];
export type UserRole = "user" | "admin";

/* ------------------------------ USERS ------------------------------ */

/** The authenticated user's own record. Never includes `password`. */
export interface UserDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  favSports: string[];
  skillLevel: SkillLevel;
  rating: number;
  gamesPlayed: number;
  eventsHosted: number;
  photoURL: string;
  memberSince: string;
  city: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

/** Another user's profile: no email, no derived-but-private fields. */
export type PublicUserDTO = Omit<
  UserDTO,
  "email" | "role" | "createdAt" | "updatedAt"
>;

/** A user reference populated onto an event (name only). */
export interface UserRefDTO {
  _id: string;
  name: string;
  skillLevel?: SkillLevel;
}

/* ------------------------------ EVENTS ------------------------------ */

export interface GeoPointDTO {
  type: "Point";
  /** [longitude, latitude] — MongoDB's order, not the spoken one. */
  coordinates: [number, number];
}

export interface EventLocationDTO {
  address: string;
  geo: GeoPointDTO;
}

export interface EventDTO {
  _id: string;
  title: string;
  sport: string;
  /** ISO 8601 string, not a Date. */
  date: string;
  location: EventLocationDTO;
  maxPlayers: number;
  currentPlayers: UserRefDTO[];
  createdBy: UserRefDTO;
  createdAt: string;
  updatedAt: string;
  /** Present only on proximity searches (lat/lng supplied). */
  distanceMetres?: number;
}

/* -------------------------- RECOMMENDATIONS -------------------------- */

export type SignalName = "sport" | "proximity" | "skill" | "social" | "urgency";

/** Per-signal scores in [0, 1], for inspecting why something ranked where it did. */
export type ScoreBreakdown = Record<SignalName, number>;

export interface RecommendedEventDTO extends EventDTO {
  /** Weighted mean of the signals, in [0, 1]. */
  score: number;
  breakdown: ScoreBreakdown;
  /** Human-readable justifications, strongest first. */
  reasons: string[];
}

export interface RecommendationsResponse {
  /** Candidates considered, before `limit` was applied. */
  count: number;
  personalised: boolean;
  events: RecommendedEventDTO[];
}

/* ----------------------------- FEEDBACK ----------------------------- */

export interface FeedbackDTO {
  _id: string;
  name: string;
  /** Withheld from the public listing. */
  email?: string;
  rating: number;
  comment: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ AUTH ------------------------------ */

export interface AuthResponse {
  success: true;
  token: string;
  user: UserDTO;
}

export interface CurrentUserResponse {
  success: true;
  user: UserDTO;
}

/* ----------------------------- ERRORS ----------------------------- */

export interface ApiErrorResponse {
  success: false;
  message: string;
  /** Present on validation failures: one entry per offending field. */
  details?: string[];
  /** Development only. */
  stack?: string;
}

/* ------------------------- REQUEST PAYLOADS ------------------------- */

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  favSports?: string[];
  skillLevel?: SkillLevel;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Only the fields a user may edit; the server rejects anything else. */
export interface UpdateProfilePayload {
  name?: string;
  favSports?: string[];
  skillLevel?: SkillLevel;
  city?: string;
  bio?: string;
}

export type LocationPayload =
  | string
  | { address: string; lat?: number; lng?: number };

export interface CreateEventPayload {
  title: string;
  sport: string;
  /** ISO string or anything `new Date()` accepts. */
  date: string;
  location: LocationPayload;
  maxPlayers: number;
}

export interface CreateFeedbackPayload {
  rating: number;
  comment: string;
}

/* ------------------------- QUERY PARAMETERS ------------------------- */

export interface Coords {
  lat: number;
  lng: number;
}

export interface EventSearchParams extends Partial<Coords> {
  sport?: string;
  radius?: number;
  upcoming?: "true" | "false";
}
