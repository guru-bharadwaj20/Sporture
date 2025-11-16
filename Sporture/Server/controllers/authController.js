// server/controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/* ----------------------- REGISTER ----------------------- */
export const register = async (req, res) => {
  try {
    const { name, email, password, favSports, skillLevel } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password, favSports, skillLevel });
    await user.save();

    const safeUser = user.toObject ? user.toObject() : user;
    delete safeUser.password;

    res.status(201).json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ------------------------ LOGIN ------------------------ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const safeUser = user.toObject ? user.toObject() : user;
    delete safeUser.password;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------- CURRENT USER -------------------- */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = req.user.toObject ? req.user.toObject() : req.user;
    delete user.password;

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
