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

const router = express.Router();

/* -------------------------- CREATE EVENT -------------------------- */
router.post("/", auth, validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, sport, date, location, maxPlayers } = req.body;

    const event = await Event.create({
      title, sport, date, location, maxPlayers,
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
    const { sport } = req.query;
    const query = {};
    if (sport) {
      // Escape regex metacharacters so a value like ".*" can't match everything
      // or cause catastrophic backtracking.
      const escaped = sport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.sport = { $regex: `^${escaped}$`, $options: "i" };
    }
    const events = await Event.find(query)
      .populate("createdBy", "name")
      .populate("currentPlayers", "name")
      .sort({ date: 1 });
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