import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/userModel.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

/** Payload we sign. Older tokens may carry _id or userId instead of id. */
interface TokenPayload extends JwtPayload {
  id?: string;
  _id?: string;
  userId?: string;
}

const auth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      throw new AppError("Access denied. No token provided.", 401);
    }

    // Verification errors (bad signature, expiry) are mapped to 401 by the
    // central error handler.
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;

    const userId = decoded.id ?? decoded._id ?? decoded.userId;
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
