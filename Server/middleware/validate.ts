import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

type Source = "body" | "query" | "params";

export const validate =
  (schema: ZodType, source: Source = "body"): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map(
        (i) => `${i.path.join(".") || source}: ${i.message}`
      );
      return next(new AppError("Validation failed", 400, details));
    }

    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      (req as unknown as Record<Source, unknown>)[source] = result.data;
    }

    next();
  };

export type Validated<TBody = unknown, TQuery = unknown, TParams = unknown> =
  Request & {
    body: TBody;
    query: TQuery;
    params: TParams;
  };
