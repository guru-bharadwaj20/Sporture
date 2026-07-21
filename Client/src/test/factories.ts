import type {
  EventDTO,
  FeedbackDTO,
  RecommendedEventDTO,
  UserDTO,
  UserRefDTO,
} from "@shared/api";

let seq = 0;
const nextId = () => `id-${(seq += 1).toString().padStart(6, "0")}`;

export const inDays = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

export const makeUserRef = (over: Partial<UserRefDTO> = {}): UserRefDTO => ({
  _id: nextId(),
  name: "Test Player",
  ...over,
});

export const makeUser = (over: Partial<UserDTO> = {}): UserDTO =>
  ({
    _id: nextId(),
    name: "Radha Raman",
    email: "radha@example.com",
    role: "user",
    favSports: ["Badminton", "Football"],
    skillLevel: "Intermediate",
    rating: 4,
    gamesPlayed: 12,
    eventsHosted: 3,
    photoURL: "",
    memberSince: "Jan 2024",
    city: "Bengaluru",
    bio: "Sports enthusiast.",
    createdAt: inDays(-90),
    updatedAt: inDays(-1),
    ...over,
  }) as UserDTO;

export const makeEvent = (over: Partial<EventDTO> = {}): EventDTO =>
  ({
    _id: nextId(),
    title: "Sunday Morning Football",
    sport: "Football",
    date: inDays(3),
    location: {
      address: "Community Ground, Bengaluru",
      geo: { type: "Point", coordinates: [77.5946, 12.9716] },
    },
    maxPlayers: 10,
    currentPlayers: [makeUserRef({ name: "Host" })],
    createdBy: makeUserRef({ name: "Host" }),
    createdAt: inDays(-5),
    updatedAt: inDays(-5),
    ...over,
  }) as EventDTO;

export const makeRecommendedEvent = (
  over: Partial<RecommendedEventDTO> = {}
): RecommendedEventDTO =>
  ({
    ...makeEvent(),
    score: 0.742,
    breakdown: { sport: 1, proximity: 0.5, skill: 1, social: 0, urgency: 0.6 },
    reasons: ["Football is one of your favourite sports"],
    ...over,
  }) as RecommendedEventDTO;

export const makeFeedback = (over: Partial<FeedbackDTO> = {}): FeedbackDTO =>
  ({
    _id: nextId(),
    name: "Ahana Sharma",
    rating: 5,
    comment: "Great app for finding local games.",
    user: nextId(),
    createdAt: inDays(-2),
    updatedAt: inDays(-2),
    ...over,
  }) as FeedbackDTO;

export const makeFullEvent = (over: Partial<EventDTO> = {}): EventDTO => {
  const maxPlayers = over.maxPlayers ?? 4;
  return makeEvent({
    maxPlayers,
    currentPlayers: Array.from({ length: maxPlayers }, (_, i) =>
      makeUserRef({ name: `Player ${i + 1}` })
    ),
    ...over,
  });
};
