import { AppError } from "../utils/AppError.js";

/** 404 fallback for unmatched routes. Must be registered after all routes. */
export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

/**
 * Centralized error handler. Express identifies this by its four arguments —
 * do not remove `next` even though it is unused.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Translate known Mongoose failures into client-facing errors.
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => e.message);
    error = new AppError("Validation failed", 400, details);
  } else if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`That ${field} is already in use`, 409);
  } else if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401);
  } else if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired, please log in again", 401);
  }

  const statusCode = error.statusCode || 500;

  // Unexpected errors are logged in full but never leaked to the client.
  if (!error.isOperational) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message: error.isOperational ? error.message : "Something went wrong",
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
