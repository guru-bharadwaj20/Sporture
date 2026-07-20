import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

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
    minlength: 6,
    select: false // never returned unless explicitly requested
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
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
    // Must be a function — a bare value is evaluated once at module load,
    // so every user created during a server's lifetime shared one timestamp.
    default: () => new Date().toLocaleString("default", { month: "short", year: "numeric" })
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

// Hash the password on create and on any change to it.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
