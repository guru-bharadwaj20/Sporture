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

export const isAppError = (err: unknown): err is AppError =>
  err instanceof AppError;
