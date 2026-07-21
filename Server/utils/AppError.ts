/**
 * Error type for failures we expect and want to surface to the client.
 * Anything thrown that is NOT an AppError is treated as an unexpected bug by
 * the error handler and reported to the client as a generic 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;
  readonly details?: string[];

  constructor(message: string, statusCode = 500, details?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Narrows an unknown caught value to AppError. */
export const isAppError = (err: unknown): err is AppError =>
  err instanceof AppError;
