import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: AppError;

  const raw = err as MongoServerError & { name?: string; path?: string; value?: unknown; errors?: Record<string, { message: string }> };

  if (err instanceof AppError) {
    error = err;
  } else if (raw.name === "ValidationError" && raw.errors) {
    error = new AppError(
      "Validation failed",
      400,
      Object.values(raw.errors).map((e) => e.message)
    );
  } else if (raw.name === "CastError") {
    error = new AppError(`Invalid ${raw.path}: ${String(raw.value)}`, 400);
  } else if (raw.code === 11000) {
    const field = Object.keys(raw.keyValue ?? {})[0] ?? "field";
    error = new AppError(`That ${field} is already in use`, 409);
  } else if (raw.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401);
  } else if (raw.name === "TokenExpiredError") {
    error = new AppError("Token expired, please log in again", 401);
  } else {
    console.error("Unhandled error:", err);
    error = new AppError("Something went wrong", 500);
    (error as { isOperational: boolean }).isOperational = false;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.isOperational ? error.message : "Something went wrong",
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === "development" && {
      stack: err instanceof Error ? err.stack : undefined,
    }),
  });
};
