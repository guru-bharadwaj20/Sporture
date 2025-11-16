import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import User from "../models/userModel.js"; // <-- IMPORT USER MODEL
import auth from "../middleware/auth.js";

const router = express.Router();

/* Utility: Normalize IDs */
const toId = (val) => {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (val._id) return val._id.toString();
  if (val.toString) return val.toString();
  return null;
};

/* -------------------------- CREATE EVENT -------------------------- */
router.post("/", auth, async (req, res) => {
  try {
    const { title, sport, date, location, maxPlayers } = req.body;

    if (!title || !sport || !date || !location || !maxPlayers) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newEvent = new Event({
      title, sport, date, location, maxPlayers,
      createdBy: req.user._id,
      currentPlayers: [req.user._id],
    });

    const event = await newEvent.save();

    // --- FIX: Increment the creator's eventsHosted count ---
    await User.findByIdAndUpdate(req.user._id, { $inc: { eventsHosted: 1, gamesPlayed: 1 } });
    // --- END OF FIX ---

    await event.populate("createdBy", "name");
    res.status(201).json(event);
  } catch (err) {
    console.error("❌ Error creating event:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* --------------------------- GET EVENTS --------------------------- */
router.get("/", async (req, res) => {
  try {
    const { sport } = req.query;
    const query = {};
    if (sport && sport.trim() !== "") {
      query.sport = { $regex: `^${sport.trim()}$`, $options: "i" };
    }
    const events = await Event.find(query)
      .populate("createdBy", "name")
      .populate("currentPlayers", "name")
      .sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ----------------------- GET JOINED/HOSTED EVENTS ----------------------- */
router.get("/joined", auth, async (req, res) => {
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
    console.error("❌ Error fetching joined events:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ---------------------------- JOIN EVENT ---------------------------- */
router.post("/:id/join", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }
    const event = await Event.findById(id)
      .populate("createdBy", "name")
      .populate("currentPlayers", "name");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = req.user._id.toString();
    const createdById = toId(event.createdBy);
    if (createdById && createdById === userId) {
      return res.status(400).json({ message: "You are the host of this event." });
    }
    const alreadyJoined = (event.currentPlayers || []).some(
      (p) => toId(p) === userId
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: "You have already joined this event." });
    }
    if (event.currentPlayers.length >= event.maxPlayers) {
      return res.status(400).json({ message: "Event is already full." });
    }

    event.currentPlayers.push(req.user._id);
    await event.save();
    
    // --- FIX: Increment the user's gamesPlayed count ---
    await User.findByIdAndUpdate(req.user._id, { $inc: { gamesPlayed: 1 } });
    // --- END OF FIX ---

    await event.populate("currentPlayers", "name");
    console.log(`✅ ${req.user.name} joined event "${event.title}"`);
    return res.json({
      success: true,
      message: `✅ You have successfully joined "${event.title}"!`,
      event,
    });
  } catch (err) {
    console.error("❌ Error joining event:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* --------------------------- GET SINGLE EVENT --------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }
    const event = await Event.findById(id)
      .populate("createdBy", "name email")
      .populate("currentPlayers", "name email");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (err) {
    console.error("❌ Error fetching event:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

export default router;