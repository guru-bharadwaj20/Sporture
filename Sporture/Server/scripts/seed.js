// Server/scripts/seed.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/userModel.js";
import Event from "../models/Event.js";

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/sporturedb";

// Shared password for every seeded dev account. Overridable so the value never
// has to be hardcoded when seeding a shared environment.
const SEED_PASSWORD = process.env.SEED_PASSWORD || "Password123!";

/** Days from today, at a given hour — keeps seeded events perpetually upcoming. */
const daysFromNow = (days, hour = 18, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/**
 * 1) Users to ensure exist (upsert by email).
 *    You can trim fields if you want; these are fine for dev seeding.
 */
const usersSeed = [
  {
    name: "Radha Raman",
    email: "radha@example.com",
    favSports: ["Badminton", "Football"],
    skillLevel: "Intermediate",
    rating: 4,
    gamesPlayed: 12,
    eventsHosted: 3,
    photoURL: "RadhaKrishna.jpg",
    memberSince: "Jan 2024",
    city: "Bengaluru",
    bio: "Sports enthusiast who loves competitive badminton and weekend football matches!",
  },
  {
    name: "Ahana Sharma",
    email: "ahana@sporture.com",
    favSports: ["Tennis", "Badminton"],
    skillLevel: "Intermediate",
    rating: 4.5,
    gamesPlayed: 20,
    eventsHosted: 5,
    photoURL: "ahana.jpg",
    memberSince: "Feb 2024",
    city: "Mumbai",
    bio: "Loves organizing community tennis matches and mentoring new players.",
  },
  {
    name: "Srivani Rao",
    email: "srivani@sporture.com",
    favSports: ["Football", "Cricket"],
    skillLevel: "Advanced",
    rating: 4.2,
    gamesPlayed: 25,
    eventsHosted: 7,
    photoURL: "srivani.jpg",
    memberSince: "Mar 2024",
    city: "Hyderabad",
    bio: "Passionate about competitive football and local league organization.",
  },
  {
    name: "Shri",
    email: "shri@sporture.com",
    favSports: ["Basketball", "Tennis"],
    skillLevel: "Intermediate",
    rating: 4.3,
    gamesPlayed: 15,
    eventsHosted: 2,
    photoURL: "shri.jpg",
    memberSince: "Apr 2024",
    city: "Chennai",
    bio: "Enjoys weekend basketball tournaments and helping manage event logistics.",
  },
  {
    name: "Arjun Patel",
    email: "arjun@sporture.com",
    favSports: ["Football"],
    skillLevel: "Beginner",
    rating: 3.8,
    gamesPlayed: 8,
    eventsHosted: 1,
    photoURL: "arjun.jpg",
    memberSince: "May 2024",
    city: "Ahmedabad",
    bio: "Football fan starting his sports journey with local club matches.",
  },
  {
    name: "Meera Iyer",
    email: "meera@sporture.com",
    favSports: ["Cricket", "Badminton"],
    skillLevel: "Professional",
    rating: 4.9,
    gamesPlayed: 45,
    eventsHosted: 10,
    photoURL: "meera.jpg",
    memberSince: "Jan 2023",
    city: "Delhi",
    bio: "Professional cricket coach and weekend badminton doubles champion.",
  },
  {
    name: "Rohit Sen",
    email: "rohit@sporture.com",
    favSports: ["Football", "Basketball"],
    skillLevel: "Advanced",
    rating: 4.4,
    gamesPlayed: 30,
    eventsHosted: 6,
    photoURL: "rohit.jpg",
    memberSince: "Jun 2024",
    city: "Kolkata",
    bio: "Multi-sport athlete passionate about community sports development.",
  },
  {
    name: "Kavya Nair",
    email: "kavya@sporture.com",
    favSports: ["Tennis"],
    skillLevel: "Intermediate",
    rating: 4.1,
    gamesPlayed: 12,
    eventsHosted: 3,
    photoURL: "kavya.jpg",
    memberSince: "Feb 2024",
    city: "Pune",
    bio: "Active tennis player promoting women's participation in local leagues.",
  },
  {
    name: "Vikram Desai",
    email: "vikram@sporture.com",
    favSports: ["Cricket"],
    skillLevel: "Professional",
    rating: 4.7,
    gamesPlayed: 40,
    eventsHosted: 9,
    photoURL: "vikram.jpg",
    memberSince: "Nov 2023",
    city: "Surat",
    bio: "Professional bowler and mentor for upcoming cricket players.",
  },
  {
    name: "Ananya Gupta",
    email: "ananya@sporture.com",
    favSports: ["Badminton", "Football"],
    skillLevel: "Beginner",
    rating: 3.9,
    gamesPlayed: 6,
    eventsHosted: 0,
    photoURL: "ananya.jpg",
    memberSince: "Jul 2024",
    city: "Lucknow",
    bio: "College student exploring new sports with friends.",
  },
];

/**
 * 2) Events defined using emails (we'll map to ObjectIds after upserting users).
 */
const eventsByEmail = [
  {
    title: "Blore vs Hyd",
    sport: "Cricket",
    date: daysFromNow(3, 10, 30),
    location: { address: "M. Chinnaswamy Stadium, Bengaluru", lat: 12.9788, lng: 77.5996 },
    maxPlayers: 22,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com"],
  },
  {
    title: "Saturday Badminton Doubles",
    sport: "Badminton",
    date: daysFromNow(5, 18, 30),
    location: { address: "Koramangala Indoor Stadium, Bengaluru", lat: 12.9352, lng: 77.6245 },
    maxPlayers: 8,
    createdByEmail: "ahana@sporture.com",
    playerEmails: ["radha@example.com", "ahana@sporture.com"],
  },
  {
    title: "Sunday Morning Football",
    sport: "Football",
    date: daysFromNow(6, 8, 0),
    location: { address: "Sree Kanteerava Stadium, Bengaluru", lat: 12.9592, lng: 77.5936 },
    maxPlayers: 22,
    createdByEmail: "srivani@sporture.com",
    playerEmails: ["srivani@sporture.com", "arjun@sporture.com"],
  },
  {
    title: "Weeknight Tennis Practice",
    sport: "Tennis",
    date: daysFromNow(2, 19, 0),
    location: { address: "Indiranagar Club, Bengaluru", lat: 12.9784, lng: 77.6408 },
    maxPlayers: 4,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com"],
  },
  {
    title: "Neighborhood Basketball Pickup",
    sport: "Basketball",
    date: daysFromNow(4, 17, 0),
    location: { address: "HSR Layout Sports Complex, Bengaluru", lat: 12.9116, lng: 77.6474 },
    maxPlayers: 10,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com", "rohit@sporture.com"],
  },
  {
    title: "Friendly Cricket Match",
    sport: "Cricket",
    date: daysFromNow(9, 8, 0),
    location: { address: "Whitefield Sports Arena, Bengaluru", lat: 12.9698, lng: 77.75 },
    maxPlayers: 22,
    createdByEmail: "srivani@sporture.com",
    playerEmails: ["radha@example.com", "vikram@sporture.com"],
  },
  {
    title: "Evening Badminton Singles",
    sport: "Badminton",
    date: daysFromNow(7, 19, 30),
    location: { address: "Jayanagar Sports Complex, Bengaluru", lat: 12.925, lng: 77.5938 },
    maxPlayers: 8,
    createdByEmail: "meera@sporture.com",
    playerEmails: [],
  },
  {
    title: "Open Tennis Ladder",
    sport: "Tennis",
    date: daysFromNow(8, 15, 0),
    location: { address: "Marathahalli Turf, Bengaluru", lat: 12.9591, lng: 77.6974 },
    maxPlayers: 16,
    createdByEmail: "ahana@sporture.com",
    playerEmails: ["ahana@sporture.com", "ananya@sporture.com"],
  },
  {
    title: "Sunday AM Cricket Nets",
    sport: "Cricket",
    date: daysFromNow(11, 6, 0),
    location: { address: "Yelahanka Stadium, Bengaluru", lat: 13.1007, lng: 77.5963 },
    maxPlayers: 12,
    createdByEmail: "arjun@sporture.com",
    playerEmails: ["arjun@sporture.com"],
  },
  {
    title: "Coed Football 7s",
    sport: "Football",
    date: daysFromNow(14, 6, 0),
    location: { address: "Electronic City Sports Hub, Bengaluru", lat: 12.8452, lng: 77.6602 },
    maxPlayers: 14,
    createdByEmail: "radha@example.com",
    playerEmails: ["radha@example.com", "rohit@sporture.com"],
  },
  {
    title: "Weekend Badminton Meetup",
    sport: "Badminton",
    date: daysFromNow(15, 12, 0),
    location: { address: "Malleshwaram Grounds, Bengaluru", lat: 13.0035, lng: 77.5647 },
    maxPlayers: 8,
    createdByEmail: "kavya@sporture.com",
    playerEmails: ["kavya@sporture.com", "ahana@sporture.com"],
  },
  {
    title: "Sunset Basketball 3v3",
    sport: "Basketball",
    date: daysFromNow(16, 17, 30),
    location: { address: "Hebbal Lake Courts, Bengaluru", lat: 13.0358, lng: 77.597 },
    maxPlayers: 6,
    createdByEmail: "meera@sporture.com",
    playerEmails: ["meera@sporture.com"],
  },
];

async function upsertUsersAndGetMap() {
  const emailToId = new Map();

  // Hash once and reuse: findOneAndUpdate does NOT trigger the pre("save")
  // hook on the User model, so hashing has to be explicit here.
  const hashed = await bcrypt.hash(SEED_PASSWORD, 12);

  for (const u of usersSeed) {
    // upsert by email; only set fields on insert so you don't overwrite your manual edits later
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: { ...u, password: hashed } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    emailToId.set(u.email, doc._id);
  }

  return emailToId;
}

async function run() {
  try {
    await mongoose.connect(MONGO);
    // Never log MONGO directly — the connection string embeds the password,
    // which would then sit in terminal scrollback and CI logs.
    console.log(`✅ Connected to MongoDB (${mongoose.connection.name})`);

    // 1) Upsert users and build email -> ObjectId map
    console.log("👤 Ensuring users exist...");
    const emailToId = await upsertUsersAndGetMap();
    console.log("✅ Users ready. Total:", emailToId.size);

    // 2) Clear events
    console.log("🧹 Clearing existing events...");
    await Event.deleteMany({});

    // 3) Build events with ObjectId references
    const events = eventsByEmail.map((e) => ({
      title: e.title,
      sport: e.sport,
      date: e.date,
      // Coordinates are supplied inline so seeding never depends on the
      // geocoding service being reachable.
      location: {
        address: e.location.address,
        geo: { type: "Point", coordinates: [e.location.lng, e.location.lat] },
      },
      maxPlayers: e.maxPlayers,
      createdBy: emailToId.get(e.createdByEmail), // ObjectId
      currentPlayers: (e.playerEmails || []).map((em) => emailToId.get(em)), // [ObjectId]
    }));

    // sanity: ensure no undefined ObjectIds
    for (const ev of events) {
      if (!ev.createdBy) {
        throw new Error(`Missing user for createdBy in event "${ev.title}". Check email.`);
      }
      if (ev.currentPlayers.some((id) => !id)) {
        throw new Error(`Missing user in currentPlayers for event "${ev.title}". Check emails.`);
      }
    }

    // 4) Insert
    console.log("📥 Inserting events...");
    const inserted = await Event.insertMany(events, { ordered: true });
    console.log(`🎉 Inserted ${inserted.length} events.`);

    // 5) Verify
    const count = await Event.countDocuments();
    console.log("📊 Current event count:", count);

    await mongoose.disconnect();
    console.log("🔌 Disconnected. Done.");
  } catch (err) {
    console.error("❌ Seed error:", err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

run();
