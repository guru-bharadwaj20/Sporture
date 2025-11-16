import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // prevent duplicate accounts
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  favSports: {
    type: [String],
    default: []
  },
  skillLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "Professional"],
    default: "Beginner"
  },
  rating: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  eventsHosted: {
    type: Number,
    default: 0
  },
  photoURL: {
    type: String,
    default: ""
  },
  memberSince: {
    type: String,
    default: new Date().toLocaleString("default", { month: "short", year: "numeric" })
  },
  city: {
    type: String,
    default: "Unknown"
  },
  bio: {
    type: String,
    default: "No bio yet."
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
