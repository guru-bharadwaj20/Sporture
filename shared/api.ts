export const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];
export type UserRole = "user" | "admin";

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

export type PublicUserDTO = Omit<
  UserDTO,
  "email" | "role" | "createdAt" | "updatedAt"
>;

export interface UserRefDTO {
  _id: string;
  name: string;
  skillLevel?: SkillLevel;
}

export interface GeoPointDTO {
  type: "Point";
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
  date: string;
  location: EventLocationDTO;
  maxPlayers: number;
  currentPlayers: UserRefDTO[];
  createdBy: UserRefDTO;
  createdAt: string;
  updatedAt: string;
  distanceMetres?: number;
}

export type SignalName = "sport" | "proximity" | "skill" | "social" | "urgency";

export type ScoreBreakdown = Record<SignalName, number>;

export interface RecommendedEventDTO extends EventDTO {
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface RecommendationsResponse {
  count: number;
  personalised: boolean;
  events: RecommendedEventDTO[];
}

export interface FeedbackDTO {
  _id: string;
  name: string;
  email?: string;
  rating: number;
  comment: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: true;
  token: string;
  user: UserDTO;
}

export interface CurrentUserResponse {
  success: true;
  user: UserDTO;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: string[];
  stack?: string;
}

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
  date: string;
  location: LocationPayload;
  maxPlayers: number;
}

export interface CreateFeedbackPayload {
  rating: number;
  comment: string;
}

export interface Coords {
  lat: number;
  lng: number;
}

export interface EventSearchParams extends Partial<Coords> {
  sport?: string;
  radius?: number;
  upcoming?: "true" | "false";
}
