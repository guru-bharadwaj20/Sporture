import express from "express";
import Feedback from "../models/Feedback.js";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createFeedbackSchema, idParamSchema } from "../validators/schemas.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();

/* ------------------------ LIST FEEDBACK ------------------------ */
// Public, but email is withheld — it is not the public's business.
router.get("/", async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .select("-email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(feedbacks);
  } catch (error) {
    next(error);
  }
});

/* ------------------------ SUBMIT FEEDBACK ------------------------ */
router.post("/", auth, validate(createFeedbackSchema), async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    // Identity comes from the token, never from the request body, so feedback
    // cannot be posted under another person's name.
    const feedback = await Feedback.create({
      name: req.user.name,
      email: req.user.email,
      user: req.user._id,
      rating,
      comment,
    });

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
});

/* ------------------------ DELETE FEEDBACK ------------------------ */
// Authors may delete their own feedback; admins may delete any.
router.delete("/:id", auth, validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) throw new AppError("Feedback not found", 404);

    const isAuthor = feedback.user && feedback.user.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== "admin") {
      throw new AppError("You can only delete your own feedback", 403);
    }

    await feedback.deleteOne();
    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
