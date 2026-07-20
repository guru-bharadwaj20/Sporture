import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";
import User from "../models/userModel.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import type { RegisterInput, LoginInput } from "../validators/schemas.js";

const signToken = (userId: Types.ObjectId | string): string =>
  jwt.sign({ id: String(userId) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);

/* ----------------------- REGISTER ----------------------- */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, favSports, skillLevel } = req.body as RegisterInput;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("An account with that email already exists", 409);
    }

    // Password is hashed by the pre-save hook on the User model.
    const user = await User.create({ name, email, password, favSports, skillLevel });

    const safeUser = user.toObject();
    delete (safeUser as { password?: string }).password;

    res.status(201).json({
      success: true,
      token: signToken(user._id),
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

/* ------------------------ LOGIN ------------------------ */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // password has `select: false` on the schema, so ask for it explicitly.
    const user = await User.findOne({ email }).select("+password");

    // Same message and code for "no such user" and "wrong password" so the
    // endpoint can't be used to enumerate registered emails.
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid credentials", 401);
    }

    const safeUser = user.toObject();
    delete (safeUser as { password?: string }).password;

    res.json({
      success: true,
      token: signToken(user._id),
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------- CURRENT USER -------------------- */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};
