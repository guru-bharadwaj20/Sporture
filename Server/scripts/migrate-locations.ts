import mongoose from "mongoose";
import { config } from "../config/env.js";

import Event from "../models/Event.js";
import { geocodeAddress } from "../services/geocoder.js";

const DRY_RUN = process.argv.includes("--dry-run");

interface Failure {
  id: unknown;
  title: unknown;
  address?: string;
  reason: string;
}

const run = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
  console.log(`Connected${DRY_RUN ? " (dry run — nothing will be written)" : ""}`);

  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connecting");
  const raw = db.collection("events");
  const stale = await raw.find({ "location.geo": { $exists: false } }).toArray();

  if (stale.length === 0) {
    console.log("No events need migrating.");
    return;
  }

  console.log(`Found ${stale.length} event(s) to migrate.\n`);

  const failures: Failure[] = [];
  let migrated = 0;

  for (const doc of stale) {
    const legacy = doc.location as string | { address?: string } | undefined;
    const address =
      typeof legacy === "string"
        ? legacy
        : legacy?.address ?? String(legacy ?? "");

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
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ id: doc._id, title: doc.title, address, reason });
    }
  }

  console.log(`\n${DRY_RUN ? "Would migrate" : "Migrated"}: ${migrated}/${stale.length}`);

  if (failures.length) {
    console.log(`\nCould not resolve ${failures.length} event(s) — left unchanged:`);
    for (const f of failures) {
      console.log(`  ${String(f.title)} (${String(f.id)}): ${f.address ?? ""} — ${f.reason}`);
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
