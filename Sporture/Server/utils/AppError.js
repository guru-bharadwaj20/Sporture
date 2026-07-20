/**
 * Error type for failures we expect and want to surface to the client.
 * Anything thrown that is NOT an AppError is treated as an unexpected bug by
 * the error handler and reported to the client as a generic 500.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
