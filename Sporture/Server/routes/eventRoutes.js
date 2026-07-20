import express from "express";
import Event from "../models/Event.js";
import User from "../models/userModel.js"; // <-- IMPORT USER MODEL
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createEventSchema,
  eventQuerySchema,
  idParamSchema,
} from "../validators/schemas.js";
import { AppError } from "../utils/AppError.js";
import { geocodeAddress } from "../services/geocoder.js";

const router = express.Router();

/**
 * Turns validated location input into the stored shape. Coordinates supplied by
 * the client are trusted (they come from a map picker or the browser's
 * geolocation API and are more precise); a bare address is geocoded.
 */
const resolveLocation = async (input) => {
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
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Applied when a search supplies a centre point but no explicit radius.
const DEFAULT_RADIUS_METRES = 25_000;

/* -------------------------- CREATE EVENT -------------------------- */
router.post("/", auth, validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, sport, date, location, maxPlayers } = req.body;

    const event = await Event.create({
      title, sport, date, maxPlayers,
      location: await resolveLocation(location),
      createdBy: req.user._id,
      currentPlayers: [req.user._id],
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { eventsHosted: 1, gamesPlayed: 1 } });

    await event.populate("createdBy", "name");
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/* --------------------------- GET EVENTS --------------------------- */
router.get("/", validate(eventQuerySchema, "query"), async (req, res, next) => {
  try {
    const { sport, lat, lng, radius, upcoming } = req.query;

    const filter = {};
    if (sport) {
      // Matched literally: unescaped, a value like ".*" would match every sport.
      filter.sport = { $regex: `^${escapeRegex(sport)}$`, $options: "i" };
    }
    if (upcoming) {
      filter.date = { $gte: new Date() };
    }

    // Without a centre point there is nothing to measure distance from, so
    // fall back to a plain chronological listing.
    if (lat === undefined) {
      const events = await Event.find(filter)
        .populate("createdBy", "name")
        .populate("currentPlayers", "name")
        .sort({ date: 1 });
      return res.json(events);
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
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1 } }],
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
    const userId = req.user._id;
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
    const userId = req.user._id;

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

    return res.json({
      success: true,
      message: `You have successfully joined "${event.title}"!`,
      event,
    });
  } catch (err) {
    next(err);
  }
});

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