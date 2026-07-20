import mongoose, { Schema, type Types, type HydratedDocument } from "mongoose";

export interface IFeedback {
  name: string;
  email: string;
  rating: number;
  comment: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackDocument = HydratedDocument<IFeedback>;

const feedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    // Author of the feedback, used for ownership checks on delete.
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);

export default Feedback;
