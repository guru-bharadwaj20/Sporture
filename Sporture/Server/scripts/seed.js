// Server/scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/userModel.js";
import Event from "../models/Event.js";

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/sporturedb";

/**
 * 1) Users to ensure exist (upsert by email).
 *    You can trim fields if you want; these are fine for dev seeding.
 */
const usersSeed = [
  {
    name: "Radha Raman",
    email: "radha@example.com",
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    password: "123456",
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
    date: new Date("2025-11-14T10:30:00"),
    location: "Chinnaswamy Stadium",
    maxPlayers: 22,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com"],
  },
  {
    title: "Saturday Badminton Doubles",
    sport: "Badminton",
    date: new Date("2025-11-08T18:30:00"),
    location: "City Sports Hall",
    maxPlayers: 8,
    createdByEmail: "ahana@sporture.com",
    playerEmails: ["radha@example.com", "ahana@sporture.com"],
  },
  {
    title: "Sunday Morning Football",
    sport: "Football",
    date: new Date("2025-11-09T08:00:00"),
    location: "Community Ground",
    maxPlayers: 22,
    createdByEmail: "srivani@sporture.com",
    playerEmails: ["srivani@sporture.com", "arjun@sporture.com"],
  },
  {
    title: "Weeknight Tennis Practice",
    sport: "Tennis",
    date: new Date("2025-11-06T19:00:00"),
    location: "Elite Sports Club",
    maxPlayers: 4,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com"],
  },
  {
    title: "Neighborhood Basketball Pickup",
    sport: "Basketball",
    date: new Date("2025-11-07T17:00:00"),
    location: "Eastside Court",
    maxPlayers: 10,
    createdByEmail: "shri@sporture.com",
    playerEmails: ["shri@sporture.com", "rohit@sporture.com"],
  },
  {
    title: "Friendly Cricket Match",
    sport: "Cricket",
    date: new Date("2025-11-15T08:00:00"),
    location: "Greenfield Grounds",
    maxPlayers: 22,
    createdByEmail: "srivani@sporture.com",
    playerEmails: ["radha@example.com", "vikram@sporture.com"],
  },
  {
    title: "Evening Badminton Singles",
    sport: "Badminton",
    date: new Date("2025-11-10T19:30:00"),
    location: "North Court",
    maxPlayers: 8,
    createdByEmail: "meera@sporture.com",
    playerEmails: [],
  },
  {
    title: "Open Tennis Ladder",
    sport: "Tennis",
    date: new Date("2025-11-12T15:00:00"),
    location: "Sunrise Tennis Club",
    maxPlayers: 16,
    createdByEmail: "ahana@sporture.com",
    playerEmails: ["ahana@sporture.com", "ananya@sporture.com"],
  },
  {
    title: "Sunday AM Cricket Nets",
    sport: "Cricket",
    date: new Date("2025-11-16T06:00:00"),
    location: "Stadium Practice Nets",
    maxPlayers: 12,
    createdByEmail: "arjun@sporture.com",
    playerEmails: ["arjun@sporture.com"],
  },
  {
    title: "Coed Football 7s",
    sport: "Football",
    date: new Date("2025-11-20T06:00:00"),
    location: "Riverside Pitch",
    maxPlayers: 14,
    createdByEmail: "radha@example.com",
    playerEmails: ["radha@example.com", "rohit@sporture.com"],
  },
  {
    title: "Weekend Badminton Meetup",
    sport: "Badminton",
    date: new Date("2025-11-21T12:00:00"),
    location: "Community Hall Court 2",
    maxPlayers: 8,
    createdByEmail: "kavya@sporture.com",
    playerEmails: ["kavya@sporture.com", "ahana@sporture.com"],
  },
  {
    title: "Sunset Basketball 3v3",
    sport: "Basketball",
    date: new Date("2025-11-22T17:30:00"),
    location: "Westend Court",
    maxPlayers: 6,
    createdByEmail: "meera@sporture.com",
    playerEmails: ["meera@sporture.com"],
  },
];

async function upsertUsersAndGetMap() {
  const emailToId = new Map();

  for (const u of usersSeed) {
    // upsert by email; only set fields on insert so you don't overwrite your manual edits later
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: u },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    emailToId.set(u.email, doc._id);
  }

  return emailToId;
}

async function run() {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB at", MONGO);

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
      location: e.location,
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
