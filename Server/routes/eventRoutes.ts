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

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DEFAULT_RADIUS_METRES = 25_000;

const RECOMMEND_RADIUS_METRES = 50_000;

const CANDIDATE_CAP = 300;

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

router.get("/", validate(eventQuerySchema, "query"), async (req, res, next) => {
  try {
    const { sport, lat, lng, radius, upcoming } = req.query as unknown as EventQuery;

    const filter: FilterQuery<IEvent> = {};
    if (sport) {
      filter.sport = { $regex: `^${escapeRegex(sport)}$`, $options: "i" };
    }
    if (upcoming) {
      filter.date = { $gte: new Date() };
    }

    if (lat === undefined || lng === undefined) {
      const events = await Event.find(filter)
        .populate("createdBy", "name")
        .populate("currentPlayers", "name")
        .sort({ date: 1 });
      res.json(events);
      return;
    }

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
      { $addFields: { distanceMetres: { $round: ["$distanceMetres", 0] } } },
    ]);

    res.json(events);
  } catch (err) {
    next(err);
  }
});

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

router.post("/:id/join", auth, validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

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
        createdBy: { $ne: userId },
        currentPlayers: { $ne: userId },
        $expr: { $lt: [{ $size: "$currentPlayers" }, "$maxPlayers"] },
      };

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

router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
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
