import mongoose, { Schema, type Types, type HydratedDocument } from "mongoose";

/**
 * GeoJSON Point. MongoDB requires [longitude, latitude] order — the reverse of
 * how coordinates are usually spoken and of what browser geolocation returns,
 * so conversion happens at the boundary in validators/schemas.ts.
 */
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface EventLocation {
  address: string;
  geo: GeoPoint;
}

export interface IEvent {
  title: string;
  sport: string;
  date: Date;
  location: EventLocation;
  maxPlayers: number;
  currentPlayers: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<IEvent>;

const pointSchema = new Schema<GeoPoint>(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v[0]! >= -180 && v[0]! <= 180 && // longitude
          v[1]! >= -90 && v[1]! <= 90,     // latitude
        message: "coordinates must be [longitude, latitude] within valid ranges",
      },
    },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    sport: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },

    location: {
      // Human-readable venue, shown in the UI.
      address: { type: String, required: true, trim: true },
      // Machine-queryable position, used for radius search and distance sorting.
      geo: { type: pointSchema, required: true },
    },

    maxPlayers: { type: Number, required: true, min: 2 },
    currentPlayers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Required for $geoNear and $geoWithin. Without it, proximity queries error out
// rather than silently running slowly.
eventSchema.index({ "location.geo": "2dsphere" });

// Covers the common "upcoming events for this sport" listing.
eventSchema.index({ sport: 1, date: 1 });

const Event = mongoose.model<IEvent>("Event", eventSchema);
export default Event;
