/**
 * Migrates Event.location from the old free-text string to the GeoJSON shape
 * introduced alongside proximity search.
 *
 *   before:  location: "Chinnaswamy Stadium"
 *   after:   location: { address: "...", geo: { type: "Point", coordinates: [lng, lat] } }
 *
 * Geocodes each distinct address once. Events whose address cannot be resolved
 * are reported and left untouched rather than guessed at — a wrong coordinate
 * is worse than a missing one, because it silently pollutes radius results.
 *
 * Usage:
 *   node scripts/migrate-locations.js --dry-run   inspect without writing
 *   node scripts/migrate-locations.js             apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Event from "../models/Event.js";
import { geocodeAddress } from "../services/geocoder.js";

const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected${DRY_RUN ? " (dry run — nothing will be written)" : ""}`);

  // Read through the driver, not the model: these documents don't match the
  // current schema, so Mongoose casting would reject them.
  const raw = mongoose.connection.db.collection("events");
  const stale = await raw.find({ "location.geo": { $exists: false } }).toArray();

  if (stale.length === 0) {
    console.log("No events need migrating.");
    return;
  }

  console.log(`Found ${stale.length} event(s) to migrate.\n`);

  const failures = [];
  let migrated = 0;

  for (const doc of stale) {
    const address =
      typeof doc.location === "string"
        ? doc.location
        : doc.location?.address ?? String(doc.location ?? "");

    if (!address.trim()) {
      failures.push({ id: doc._id, title: doc.title, reason: "empty address" });
      continue;
    }

    try {
      const { lat, lng, displayName } = await geocodeAddress(address);

      if (DRY_RUN) {
        console.log(`  would migrate "${doc.title}"`);
        console.log(`    ${address}  ->  [${lng}, ${lat}]  (${displayName})`);
      } else {
        await raw.updateOne(
          { _id: doc._id },
          { $set: { location: { address, geo: { type: "Point", coordinates: [lng, lat] } } } }
        );
        console.log(`  migrated "${doc.title}" -> [${lng}, ${lat}]`);
      }
      migrated += 1;
    } catch (err) {
      failures.push({ id: doc._id, title: doc.title, address, reason: err.message });
    }
  }

  console.log(`\n${DRY_RUN ? "Would migrate" : "Migrated"}: ${migrated}/${stale.length}`);

  if (failures.length) {
    console.log(`\nCould not resolve ${failures.length} event(s) — left unchanged:`);
    for (const f of failures) {
      console.log(`  ${f.title} (${f._id ?? f.id}): ${f.address ?? ""} — ${f.reason}`);
    }
    console.log(
      "\nFix these by editing the event's address to something geocodable, " +
        "then re-running this script."
    );
  }
};

run()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
