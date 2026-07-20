// server/routes/authRoutes.js
import express from "express";
import { register, login, getCurrentUser } from "../controllers/authController.js";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/schemas.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

// Protected: returns the user associated with the Bearer token
router.get("/me", auth, getCurrentUser);

export default router;
