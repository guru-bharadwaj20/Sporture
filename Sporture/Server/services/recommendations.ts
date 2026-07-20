import type { SkillLevel } from "../models/userModel.js";

/**
 * Event recommendation scoring.
 *
 * Every function here is pure: given the same inputs it returns the same
 * output, with no database access and no clock reads beyond an explicitly
 * passed `now`. That is what makes the weighting testable in isolation —
 * scoring rules are the part most likely to be tuned, and tuning without
 * tests is how ranking quietly regresses.
 *
 * Each signal returns a value in [0, 1]. The final score is the weighted sum
 * divided by the total weight, so it also lands in [0, 1] and stays
 * comparable if weights are changed later.
 */

export const WEIGHTS = {
  sport: 3.0,     // strongest signal: people search by the sport they play
  proximity: 2.5, // a great match across the city is not a match
  skill: 2.0,     // mismatched levels make a game unfun for both sides
  social: 1.5,    // playing with familiar people is a real draw
  urgency: 1.0,   // nudge toward events that are soon and still fillable
} as const;

export type SignalName = keyof typeof WEIGHTS;
export type Breakdown = Record<SignalName, number>;

const SKILL_ORDER: readonly string[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
];

/** Neutral score used when an input is missing — never rewards or punishes. */
const NEUTRAL = 0.5;

/** Minimal shape the scorer needs; deliberately looser than the Mongoose doc
 *  so plain aggregation results and lean() objects both satisfy it. */
export interface ScorableEvent {
  _id?: unknown;
  sport?: string;
  date: Date | string;
  maxPlayers: number;
  currentPlayers?: Array<{ _id?: unknown } | unknown>;
  // Populated host. Extra fields are permitted because this arrives from both
  // .populate() and an aggregation $lookup, which carry _id and more besides.
  createdBy?: ({ skillLevel?: SkillLevel; name?: string } & Record<string, unknown>) | null;
  distanceMetres?: number;
  // Callers pass richer objects than this (title, location, ...); rankEvents is
  // generic so those survive, and this keeps the fixture types honest.
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

/* ------------------------------ SIGNALS ------------------------------ */

/**
 * Does this event match a sport the user says they play?
 * Users with no stated preferences get a neutral score for everything rather
 * than zero, otherwise a new account would see all events ranked equally low.
 */
export const sportAffinity = (favSports: string[] | undefined, sport?: string): number => {
  if (!Array.isArray(favSports) || favSports.length === 0) return NEUTRAL;
  if (!sport) return 0.15;

  const wanted = favSports.map((s) => s.trim().toLowerCase());
  return wanted.includes(sport.trim().toLowerCase()) ? 1 : 0.15;
};

/**
 * Exponential decay with a 5 km half-life: an event 5 km away scores 0.5,
 * 10 km scores 0.25. Chosen over a linear falloff because the difference
 * between 1 km and 3 km matters far more to a player than 20 km vs 22 km.
 */
export const proximityScore = (
  distanceMetres: number | undefined | null,
  halfLifeMetres = 5000
): number => {
  if (distanceMetres === undefined || distanceMetres === null) return NEUTRAL;
  if (distanceMetres <= 0) return 1;
  return 0.5 ** (distanceMetres / halfLifeMetres);
};

/**
 * Closeness of the host's skill level to the user's. Ordinal, not nominal:
 * Beginner→Intermediate is a much smaller gap than Beginner→Professional.
 */
export const skillMatch = (userLevel?: string, hostLevel?: string): number => {
  const a = SKILL_ORDER.indexOf(userLevel ?? "");
  const b = SKILL_ORDER.indexOf(hostLevel ?? "");
  if (a === -1 || b === -1) return NEUTRAL;

  return [1, 0.6, 0.3, 0.1][Math.abs(a - b)] ?? 0.1;
};

/**
 * Fraction of the event's players the user has previously played with.
 * Saturates at a third: knowing one person in a group of six is most of the
 * social benefit, and beyond that this signal would drown out the others.
 */
export const socialSignal = (
  pastTeammateIds: Set<string> | undefined,
  playerIds: unknown[] | undefined
): number => {
  if (!pastTeammateIds?.size || !playerIds?.length) return 0;

  const known = playerIds.filter((id) => pastTeammateIds.has(String(id))).length;
  if (known === 0) return 0;

  return Math.min(1, known / Math.max(1, playerIds.length / 3));
};

/**
 * Favours events that are soon and still joinable.
 *
 * Fill level is scored on an inverted-U: a completely empty event suggests
 * nobody is going, while a nearly-full one risks filling before the user
 * acts. Around two-thirds full scores highest.
 */
export const urgencyScore = (
  spotsTaken: number,
  maxPlayers: number,
  eventDate: Date | string,
  now: Date = new Date()
): number => {
  const days = (new Date(eventDate).getTime() - now.getTime()) / 86400000;
  if (days < 0) return 0; // already started

  // Peaks at "this week", tapering for anything more than a fortnight out.
  const timing = days <= 7 ? 1 - days / 14 : Math.max(0, 0.5 - (days - 7) / 28);

  const ratio = maxPlayers > 0 ? spotsTaken / maxPlayers : 0;
  if (ratio >= 1) return 0; // full
  const fill = 1 - Math.abs(ratio - 0.66) / 0.66;

  return Math.max(0, (timing + Math.max(0, fill)) / 2);
};

/* ------------------------------ SCORING ------------------------------ */

export interface ScoredEvent {
  score: number;
  breakdown: Breakdown;
  reasons: string[];
}

/** Scores a single event for a user. */
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

/**
 * Human-readable justifications, strongest first.
 *
 * Shown in the UI because an unexplained ranking reads as arbitrary — telling
 * someone *why* an event is suggested is what makes the ordering trustworthy.
 */
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

/**
 * Ranks a candidate list.
 *
 * Ties break on date, then on id. The id tiebreak looks redundant but is what
 * makes the ordering total: two events with the same score and the same date
 * would otherwise fall back on input order, so the same request could return
 * a different sequence run to run — which breaks paging (an item can be
 * skipped or repeated across pages).
 */
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
