import type { SkillLevel } from "../models/userModel.js";

export const WEIGHTS = {
  sport: 3.0,
  proximity: 2.5,
  skill: 2.0,
  social: 1.5,
  urgency: 1.0,
} as const;

export type SignalName = keyof typeof WEIGHTS;
export type Breakdown = Record<SignalName, number>;

const SKILL_ORDER: readonly string[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
];

const NEUTRAL = 0.5;

export interface ScorableEvent {
  _id?: unknown;
  sport?: string;
  date: Date | string;
  maxPlayers: number;
  currentPlayers?: Array<{ _id?: unknown } | unknown>;
  createdBy?: ({ skillLevel?: SkillLevel; name?: string } & Record<string, unknown>) | null;
  distanceMetres?: number;
  [key: string]: unknown;
}

export interface ScoringUser {
  favSports?: string[];
  skillLevel?: SkillLevel;
}

export interface ScoringContext {
  pastTeammateIds?: Set<string>;
  now?: Date;
}

export const sportAffinity = (favSports: string[] | undefined, sport?: string): number => {
  if (!Array.isArray(favSports) || favSports.length === 0) return NEUTRAL;
  if (!sport) return 0.15;

  const wanted = favSports.map((s) => s.trim().toLowerCase());
  return wanted.includes(sport.trim().toLowerCase()) ? 1 : 0.15;
};

export const proximityScore = (
  distanceMetres: number | undefined | null,
  halfLifeMetres = 5000
): number => {
  if (distanceMetres === undefined || distanceMetres === null) return NEUTRAL;
  if (distanceMetres <= 0) return 1;
  return 0.5 ** (distanceMetres / halfLifeMetres);
};

export const skillMatch = (userLevel?: string, hostLevel?: string): number => {
  const a = SKILL_ORDER.indexOf(userLevel ?? "");
  const b = SKILL_ORDER.indexOf(hostLevel ?? "");
  if (a === -1 || b === -1) return NEUTRAL;

  return [1, 0.6, 0.3, 0.1][Math.abs(a - b)] ?? 0.1;
};

export const socialSignal = (
  pastTeammateIds: Set<string> | undefined,
  playerIds: unknown[] | undefined
): number => {
  if (!pastTeammateIds?.size || !playerIds?.length) return 0;

  const known = playerIds.filter((id) => pastTeammateIds.has(String(id))).length;
  if (known === 0) return 0;

  return Math.min(1, known / Math.max(1, playerIds.length / 3));
};

export const urgencyScore = (
  spotsTaken: number,
  maxPlayers: number,
  eventDate: Date | string,
  now: Date = new Date()
): number => {
  const days = (new Date(eventDate).getTime() - now.getTime()) / 86400000;
  if (days < 0) return 0;

  const timing = days <= 7 ? 1 - days / 14 : Math.max(0, 0.5 - (days - 7) / 28);

  const ratio = maxPlayers > 0 ? spotsTaken / maxPlayers : 0;
  if (ratio >= 1) return 0;
  const fill = 1 - Math.abs(ratio - 0.66) / 0.66;

  return Math.max(0, (timing + Math.max(0, fill)) / 2);
};

export interface ScoredEvent {
  score: number;
  breakdown: Breakdown;
  reasons: string[];
}

export const scoreEvent = (
  event: ScorableEvent,
  user: ScoringUser,
  ctx: ScoringContext = {}
): ScoredEvent => {
  const { pastTeammateIds = new Set<string>(), now = new Date() } = ctx;

  const playerIds = (event.currentPlayers ?? []).map((p) =>
    p && typeof p === "object" && "_id" in p ? (p as { _id: unknown })._id : p
  );
  const hostLevel = event.createdBy?.skillLevel;

  const signals: Breakdown = {
    sport: sportAffinity(user.favSports, event.sport),
    proximity: proximityScore(event.distanceMetres),
    skill: skillMatch(user.skillLevel, hostLevel),
    social: socialSignal(pastTeammateIds, playerIds),
    urgency: urgencyScore(playerIds.length, event.maxPlayers, event.date, now),
  };

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const score =
    (Object.keys(signals) as SignalName[]).reduce(
      (sum, k) => sum + signals[k] * WEIGHTS[k],
      0
    ) / totalWeight;

  return {
    score: Number(score.toFixed(4)),
    breakdown: signals,
    reasons: buildReasons(signals, event, user, pastTeammateIds, playerIds, now),
  };
};

const buildReasons = (
  signals: Breakdown,
  event: ScorableEvent,
  user: ScoringUser,
  pastTeammateIds: Set<string>,
  playerIds: unknown[],
  now: Date
): string[] => {
  const reasons: Array<{ weight: number; text: string }> = [];

  if (signals.sport === 1) {
    reasons.push({ weight: WEIGHTS.sport, text: `${event.sport} is one of your favourite sports` });
  }

  if (event.distanceMetres !== undefined && signals.proximity > 0.4) {
    const km = event.distanceMetres / 1000;
    reasons.push({
      weight: WEIGHTS.proximity * signals.proximity,
      text: km < 1
        ? `Only ${Math.round(event.distanceMetres)} m away`
        : `Just ${km.toFixed(1)} km away`,
    });
  }

  if (signals.skill >= 0.6 && event.createdBy?.skillLevel) {
    reasons.push({
      weight: WEIGHTS.skill * signals.skill,
      text: signals.skill === 1
        ? `Host plays at your level (${user.skillLevel})`
        : `Host's level is close to yours`,
    });
  }

  if (signals.social > 0) {
    const known = playerIds.filter((id) => pastTeammateIds.has(String(id))).length;
    reasons.push({
      weight: WEIGHTS.social * signals.social,
      text: `You've played with ${known} ${known === 1 ? "person" : "people"} here before`,
    });
  }

  const spotsLeft = event.maxPlayers - playerIds.length;
  const days = Math.ceil((new Date(event.date).getTime() - now.getTime()) / 86400000);
  if (spotsLeft > 0 && days >= 0 && days <= 7) {
    reasons.push({
      weight: WEIGHTS.urgency * signals.urgency,
      text: `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left, ${
        days <= 1 ? "starting soon" : `in ${days} days`
      }`,
    });
  }

  return reasons.sort((a, b) => b.weight - a.weight).map((r) => r.text);
};

export const rankEvents = <T extends ScorableEvent>(
  events: T[],
  user: ScoringUser,
  ctx: ScoringContext = {}
): Array<T & ScoredEvent> =>
  events
    .map((event) => ({ ...event, ...scoreEvent(event, user, ctx) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        String(a._id).localeCompare(String(b._id))
    );
