// server/controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

/* ----------------------- REGISTER ----------------------- */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, favSports, skillLevel } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("An account with that email already exists", 409);
    }

    // Password is hashed by the pre-save hook on the User model.
    const user = await User.create({ name, email, password, favSports, skillLevel });

    const safeUser = user.toObject();
    delete safeUser.password;

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
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // password has `select: false` on the schema, so ask for it explicitly.
    const user = await User.findOne({ email }).select("+password");

    // Same message and code for "no such user" and "wrong password" so the
    // endpoint can't be used to enumerate registered emails.
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid credentials", 401);
    }

    const safeUser = user.toObject();
    delete safeUser.password;

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
export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};
