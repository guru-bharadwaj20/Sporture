// server/routes/authRoutes.js
import express from "express";
import { register, login, getCurrentUser } from "../controllers/authController.js";
import auth from "../middleware/auth.js"; // adjust path if your middleware sits elsewhere

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected: returns the user associated with the Bearer token
router.get("/me", auth, getCurrentUser);

export default router;
