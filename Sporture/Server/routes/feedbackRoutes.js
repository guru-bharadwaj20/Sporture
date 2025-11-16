import express from "express";
import Feedback from "../models/Feedback.js";

const router = express.Router();

// Get all feedback (sorted by newest first)
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching feedback", error: error.message });
  }
});

// Submit new feedback
router.post("/", async (req, res) => {
  try {
    const { name, email, rating, comment } = req.body;

    // Validation
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const feedback = new Feedback({
      name,
      email,
      rating,
      comment,
    });

    const savedFeedback = await feedback.save();
    res.status(201).json(savedFeedback);
  } catch (error) {
    res.status(500).json({ message: "Error submitting feedback", error: error.message });
  }
});

// Optional: Delete feedback (admin functionality)
router.delete("/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting feedback", error: error.message });
  }
});

export default router;