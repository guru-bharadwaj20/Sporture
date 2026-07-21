import express, { type Request, type Response, type NextFunction } from "express";
import multer, { type FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/userModel.js";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema, idParamSchema } from "../validators/schemas.js";
import type { UpdateProfileInput } from "../validators/schemas.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Derive the extension from the detected mimetype rather than trusting
    // the client-supplied filename, which could carry a misleading extension.
    const ext =
      file.mimetype === "image/png" ? ".png"
      : file.mimetype === "image/webp" ? ".webp"
      : ".jpg";
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new AppError("Only JPEG, PNG and WebP images are allowed", 400));
    }
    cb(null, true);
  },
});

/** Rejects the request unless the caller is acting on their own account. */
const requireSelf = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?._id.toString() !== req.params.id) {
    return next(new AppError("You can only modify your own profile", 403));
  }
  next();
};

/* ---------------------- GET PUBLIC PROFILE ---------------------- */
router.get("/:id", auth, validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    // Only fields that are safe for another user to see.
    const user = await User.findById(req.params.id).select(
      "name favSports skillLevel rating gamesPlayed eventsHosted photoURL memberSince city bio"
    );
    if (!user) throw new AppError("User not found", 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/* -------------------------- UPDATE SELF -------------------------- */
router.put(
  "/:id",
  auth,
  validate(idParamSchema, "params"),
  requireSelf,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      // req.body has been stripped to the allowlisted fields by `validate`,
      // so this cannot be used to overwrite password, email or rating.
      const updated = await User.findByIdAndUpdate(
        req.params.id,
        req.body as UpdateProfileInput,
        { new: true, runValidators: true }
      );
      if (!updated) throw new AppError("User not found", 404);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/* ---------------------- UPLOAD PROFILE PHOTO ---------------------- */
router.post(
  "/:id/upload-photo",
  auth,
  validate(idParamSchema, "params"),
  requireSelf,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("No file uploaded", 400);

      const photoURL = `${config.backendUrl}/uploads/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { photoURL },
        { new: true }
      );
      if (!user) throw new AppError("User not found", 404);

      res.json({ message: "Profile photo updated", user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
