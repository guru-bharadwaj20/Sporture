// server/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const auth = async (req, res, next) => {
  try {
    const header = req.header("Authorization");
    const token = header ? header.replace("Bearer ", "") : null;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) {
      console.error("⚠️ Token payload missing user id:", decoded);
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      console.error("❌ Authenticated user not found in DB:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    console.log("✅ Authenticated user:", user.name, "(", user._id.toString(), ")");
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error in auth middleware", error: error.message });
  }
};

export default auth;
