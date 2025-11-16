// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sport: { type: String, required: true },
    date: { type: Date, required: true },

    // ✅ Flexible location schema
    location: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      get: function (val) {
        if (typeof val === "string") return val;
        if (val && val.address) return val.address;
        return JSON.stringify(val);
      },
      set: function (val) {
        if (typeof val === "string") return val;
        if (val && val.address) return val.address;
        return JSON.stringify(val);
      },
    },

    maxPlayers: { type: Number, required: true },
    currentPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
