// server/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";

const auth = async (req, res, next) => {
  try {
    const header = req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      throw new AppError("Access denied. No token provided.", 401);
    }

    // Verification errors (invalid signature, expiry) are mapped to 401 by the
    // central error handler.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) {
      throw new AppError("Invalid token payload", 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      // The token is well-formed but its subject no longer exists — that is an
      // authentication failure, not a missing resource.
      throw new AppError("Invalid or expired token", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default auth;
