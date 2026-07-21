import express from "express";
import type { FilterQuery, PipelineStage } from "mongoose";
import Event, { type IEvent, type EventLocation } from "../models/Event.js";
import User from "../models/userModel.js";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createEventSchema,
  eventQuerySchema,
  idParamSchema,
  recommendQuerySchema,
} from "../validators/schemas.js";
import type {
  CreateEventInput,
  EventQuery,
  LocationInput,
  RecommendQuery,
} from "../validators/schemas.js";
import { AppError } from "../utils/AppError.js";
import { geocodeAddress } from "../services/geocoder.js";
import { rankEvents, type ScorableEvent } from "../services/recommendations.js";

const router = express.Router();

/**
 * Turns validated location input into the stored shape. Coordinates supplied by
 * the client are trusted (they come from a map picker or the browser's
 * geolocation API and are more precise); a bare address is geocoded.
 */
const resolveLocation = async (input: LocationInput): Promise<EventLocation> => {
  if (typeof input === "string") {
    const { lat, lng } = await geocodeAddress(input);
    return { address: input, geo: { type: "Point", coordinates: [lng, lat] } };
  }

  if (input.lat !== undefined && input.lng !== undefined) {
    return {
      address: input.address,
      geo: { type: "Point", coordinates: [input.lng, input.lat] },
    };
  }

  const { lat, lng } = await geocodeAddress(input.address);
  return { address: input.address, geo: { type: "Point", coordinates: [lng, lat] } };
};

/** Escapes regex metacharacters so user input is matched literally. */
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Applied when a search supplies a centre point but no explicit radius.
const DEFAULT_RADIUS_METRES = 25_000;

// Recommendations search wider than discovery — a strong match slightly
// further out is still worth surfacing.
const RECOMMEND_RADIUS_METRES = 50_000;

// Upper bound on events pulled into memory for scoring.
const CANDIDATE_CAP = 300;

/** Joins host and player names onto aggregation results. */
const populateStages = (hostFields: Record<string, 1>): PipelineStage[] => [
  {
    $lookup: {
      from: "users",
      localField: "createdBy",
      foreignField: "_id",
      as: "createdBy",
      pipeline: [{ $project: hostFields }],
    },
  },
  { $unwind: "$createdBy" },
  {
    $lookup: {
      from: "users",
      localField: "currentPlayers",
      foreignField: "_id",
      as: "currentPlayers",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
];

/* -------------------------- CREATE EVENT -------------------------- */
router.post("/", auth, validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, sport, date, location, maxPlayers } = req.body as CreateEventInput;
    const userId = req.user!._id;

    const event = await Event.create({
      title, sport, date, maxPlayers,
      location: await resolveLocation(location),
      createdBy: userId,
      currentPlayers: [userId],
    });

    await User.findByIdAndUpdate(userId, { $inc: { eventsHosted: 1, gamesPlayed: 1 } });

    await event.populate("createdBy", "name");
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/* --------------------------- GET EVENTS --------------------------- */
router.get("/", validate(eventQuerySchema, "query"), async (req, res, next) => {
  try {
    const { sport, lat, lng, radius, upcoming } = req.query as unknown as EventQuery;

    const filter: FilterQuery<IEvent> = {};
    if (sport) {
      // Matched literally: unescaped, a value like ".*" would match every sport.
      filter.sport = { $regex: `^${escapeRegex(sport)}$`, $options: "i" };
    }
    if (upcoming) {
      filter.date = { $gte: new Date() };
    }

    // Without a centre point there is nothing to measure distance from, so
    // fall back to a plain chronological listing.
    if (lat === undefined || lng === undefined) {
      const events = await Event.find(filter)
        .populate("createdBy", "name")
        .populate("currentPlayers", "name")
        .sort({ date: 1 });
      res.json(events);
      return;
    }

    // $geoNear must be the first stage in the pipeline and applies its own
    // filter, which is why `filter` is passed to it rather than added as a
    // separate $match. Results come back sorted nearest-first.
    const events = await Event.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMetres",
          maxDistance: radius ?? DEFAULT_RADIUS_METRES,
          query: filter,
          spherical: true,
        },
      },
      { $limit: 200 },
      ...populateStages({ name: 1 }),
      // Rounded because sub-metre precision is noise given geocoding accuracy.
      { $addFields: { distanceMetres: { $round: ["$distanceMetres", 0] } } },
    ]);

    res.json(events);
  } catch (err) {
    next(err);
  }
});

/* ----------------------- GET JOINED/HOSTED EVENTS ----------------------- */
router.get("/joined", auth, async (req, res, next) => {
  try {
    const userId = req.user!._id;
    const events = await Event.find({
      $or: [{ currentPlayers: userId }, { createdBy: userId }],
    })
      .populate("createdBy", "name")
      .populate("currentPlayers", "name")
      .sort({ date: 1 });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- JOIN EVENT ---------------------------- */
router.post("/:id/join", auth, validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    // Single atomic operation: the capacity and duplicate checks are part of
    // the update's filter, so two simultaneous joins cannot both succeed on
    // the final slot. A read-then-write would let the event exceed maxPlayers.
    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        createdBy: { $ne: userId },
        currentPlayers: { $ne: userId },
        date: { $gt: new Date() },
        $expr: { $lt: [{ $size: "$currentPlayers" }, "$maxPlayers"] },
      },
      { $addToSet: { currentPlayers: userId } },
      { new: true }
    )
      .populate("createdBy", "name")
      .populate("currentPlayers", "name");

    // The filter matched nothing — re-read to report *why* it failed.
    if (!event) {
      const existing = await Event.findById(id);
      if (!existing) throw new AppError("Event not found", 404);
      if (existing.createdBy.toString() === userId.toString()) {
        throw new AppError("You are the host of this event.", 400);
      }
      if (existing.currentPlayers.some((p) => p.toString() === userId.toString())) {
        throw new AppError("You have already joined this event.", 400);
      }
      if (existing.date <= new Date()) {
        throw new AppError("This event has already started.", 400);
      }
      throw new AppError("Event is already full.", 400);
    }

    await User.findByIdAndUpdate(userId, { $inc: { gamesPlayed: 1 } });

    res.json({
      success: true,
      message: `You have successfully joined "${event.title}"!`,
      event,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------- RECOMMENDED EVENTS -------------------------- */
/**
 * Personalised ranking. Must stay above the "/:id" route below, or Express
 * matches "recommended" as an event id.
 *
 * Candidates are narrowed in MongoDB (upcoming, joinable, not already the
 * user's) and then scored in application code. Scoring in TS rather than an
 * aggregation keeps the weighting readable and unit-testable; the trade-off is
 * that it needs the candidate set in memory, which is why it is capped. At a
 * scale where that cap bites, the scoring would move into the pipeline.
 */
router.get(
  "/recommended",
  auth,
  validate(recommendQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const { lat, lng, limit = 10 } = req.query as unknown as RecommendQuery;
      const user = req.user!;
      const userId = user._id;
      const now = new Date();

      const baseFilter: FilterQuery<IEvent> = {
        date: { $gt: now },
        createdBy: { $ne: userId },      // your own events aren't suggestions
        currentPlayers: { $ne: userId }, // nor ones you're already in
        $expr: { $lt: [{ $size: "$currentPlayers" }, "$maxPlayers"] }, // not full
      };

      // People the user has already played alongside, used by the social
      // signal. Their own id is removed so it never counts as a match.
      const history = await Event.find({ currentPlayers: userId })
        .select("currentPlayers")
        .limit(100)
        .lean();

      const pastTeammateIds = new Set(
        history.flatMap((e) => e.currentPlayers.map((p) => String(p)))
      );
      pastTeammateIds.delete(String(userId));

      let candidates: ScorableEvent[];

      if (lat !== undefined && lng !== undefined) {
        // $geoNear attaches distanceMetres, which the proximity signal needs.
        candidates = await Event.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lng, lat] },
              distanceField: "distanceMetres",
              maxDistance: RECOMMEND_RADIUS_METRES,
              query: baseFilter,
              spherical: true,
            },
          },
          { $limit: CANDIDATE_CAP },
          ...populateStages({ name: 1, skillLevel: 1 }),
        ]);
      } else {
        // Without a centre point, proximity scores neutral for every event and
        // ranking falls back to the remaining signals.
        candidates = (await Event.find(baseFilter)
          .populate("createdBy", "name skillLevel")
          .populate("currentPlayers", "name")
          .sort({ date: 1 })
          .limit(CANDIDATE_CAP)
          .lean()) as unknown as ScorableEvent[];
      }

      const ranked = rankEvents(candidates, user, { pastTeammateIds, now });

      res.json({
        count: ranked.length,
        personalised: Boolean(user.favSports?.length) || lat !== undefined,
        events: ranked.slice(0, limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

/* --------------------------- GET SINGLE EVENT --------------------------- */
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    // Emails are not exposed here — this route is public, and the participant
    // list of an event should not leak contact details.
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("currentPlayers", "name");
    if (!event) throw new AppError("Event not found", 404);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

export default router;
